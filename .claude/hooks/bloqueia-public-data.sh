#!/bin/sh
''':'
# Este arquivo é Python. No Mac a primeira linha bastava; no Windows o harness abre
# hook .sh como "bash arquivo", e em 18/11/2026 o texto abaixo foi lido como shell:
# os exemplos entre crases rodaram git push de verdade. Estas linhas valem nos dois
# sistemas: o shell entrega o arquivo ao Python e nunca passa daqui.
# PYTHONUTF8: no Windows o Python leria o JSON em cp1252, e um acento no comando
# derrubava a leitura (a trava deixava passar sem julgar).
export PYTHONUTF8=1
command -v python3 >/dev/null 2>&1 && exec python3 "$0" "$@"
command -v python >/dev/null 2>&1 && exec python "$0" "$@"
echo "BLOQUEADO: a trava precisa do Python (python3 ou python) e não achou." >&2
exit 2
'''
"""PreToolUse hook (Bash, PowerShell, Edit, Write, NotebookEdit) do Claude Code.

`public/data/` guarda os arquivos VERSIONADOS de dados científicos (estrelas,
galáxia, corpos, efemérides, texturas). Regenerar, apagar, mover ou sobrescrever
qualquer um deles é obra que só o dono pede. Ler é livre; `npm run data:verify`
é leitura e passa.

Entrada: JSON no stdin ({tool_name, tool_input}).
Saída: exit 0 deixa passar; exit 2 bloqueia e mostra o motivo (stderr) ao agente.
"""
import json
import posixpath
import re
import shlex
import sys

PASTA = "public/data"
AVISO = (
    "public/data são os dados científicos versionados do site; regenerar, apagar ou "
    "sobrescrever só com pedido do dono. Ler é livre, e `npm run data:verify` passa."
)

# comandos que escrevem/apagam: barrados se QUALQUER argumento toca a pasta
DESTRUTIVOS = {"rm", "rmdir", "unlink", "shred", "truncate", "tee", "touch", "mkdir", "dd", "install"}
# comandos que copiam/movem: barrados se o DESTINO (último argumento) toca a pasta;
# mv e rsync também se a ORIGEM toca (mover para fora = apagar)
COPIAM = {"cp", "rsync", "ditto"}
MOVEM = {"mv", "rename"}
# scripts que regeneram a pasta (todos os `npm run data:*`, menos o verify)
REGENERA_NPM = re.compile(r"\bdata:(?!verify\b)[\w:-]+")
REGENERA_NODE = re.compile(r"scripts/data/(?!verify-assets)\S+\.(m?js)\b")
# escrita por código inline (node -e, python -c)
ESCRITA_INLINE = re.compile(
    r"writeFile|createWriteStream|appendFile|rmSync|rm\(|unlink|rename|copyFile|mkdir|"
    r"open\([^)]*['\"][wa]|shutil\.|os\.remove|os\.rename|Path\([^)]*\)\.(write|unlink)"
)
# redirecionamento para dentro da pasta: > public/data/x ou >> "public/data/x"
REDIRECAO = re.compile(r"(?<![<>&\d])>>?\s*['\"]?([^\s'\"|;&>]+)")
# PowerShell (a ferramenta principal no Windows): a trava não analisa a sintaxe dele.
# Barra o comando que cita a pasta (ou entra em public) E traz um verbo que escreve,
# apaga, copia ou move, um `>` ou uma chamada .NET de escrita. Barra de mais de
# propósito; só leitura passa.
ESCREVE_PS = re.compile(
    r"(?i)(?<![\w-])(remove-item|ri|rm|rmdir|rd|del|erase|move-item|mi|mv|move|rename-item|rni|"
    r"ren|copy-item|cpi|cp|copy|set-content|add-content|ac|clear-content|clc|out-file|new-item|"
    r"ni|tee-object|tee|export-\w+|compress-archive|expand-archive|robocopy|xcopy)(?![\w-])"
    r"|::(write|append|delete|move|copy|create|replace|open)\w*\(|\bgit\s+clean\b|(?<![<>&\d=-])>"
)
ENTRA_EM_PUBLIC = re.compile(
    r"(?i)(?<![\w-])(cd|chdir|sl|set-location|pushd|push-location)\s+\S*public"
)


def bloquear(motivo):
    print(f"BLOQUEADO pelo hook bloqueia-public-data: {motivo}", file=sys.stderr)
    print(AVISO, file=sys.stderr)
    sys.exit(2)


def toca(token, cwd=""):
    # o caminho é julgado a partir da pasta onde o comando está (`cd public &&
    # rm -rf data` toca a pasta tanto quanto `rm -rf public/data`)
    caminho = posixpath.normpath(posixpath.join(cwd, token.replace("\\", "/")))
    return PASTA in caminho or caminho.endswith("/" + PASTA)


def novo_cwd(cwd, tokens):
    # segue `cd X` / `pushd X` para julgar os caminhos relativos que vêm depois
    if tokens[0] not in {"cd", "pushd"}:
        return cwd
    alvo = next((t for t in tokens[1:] if not t.startswith("-")), None)
    if alvo is None or alvo == "-":
        return ""
    return posixpath.normpath(posixpath.join(cwd, alvo.replace("\\", "/")))


def segmentos(comando):
    return [s.strip() for s in re.split(r"\n|;|&&|\|\||\|", comando) if s.strip()]


def tokens_de(segmento):
    try:
        return shlex.split(segmento)
    except ValueError:
        return segmento.split()


def julgar_regeneracao(comando):
    # regeneração: independe de citar a pasta, porque o script sabe o caminho
    m = REGENERA_NPM.search(comando)
    if m and re.search(r"\bnpm\s+(run\s+)?" + re.escape(m.group(0)), comando):
        bloquear(f"`npm run {m.group(0)}` regenera public/data")
    m = REGENERA_NODE.search(comando)
    if m and re.search(r"\b(node|npx|tsx)\b", comando):
        bloquear(f"`{m.group(0)}` regenera public/data")


def julgar_powershell(comando):
    norm = comando.replace("\\", "/")
    julgar_regeneracao(norm)
    if PASTA not in norm.lower() and not ENTRA_EM_PUBLIC.search(norm):
        return
    m = ESCREVE_PS.search(norm) or ESCRITA_INLINE.search(norm)
    if m:
        bloquear(
            f"comando de PowerShell que cita public/data e traz `{m.group(0)}` "
            "(a trava não analisa PowerShell: com a pasta no comando, só leitura passa)"
        )


def julgar_bash(comando):
    julgar_regeneracao(comando)

    # sem "public" em lugar nenhum, nem `cd` para lá: não há o que julgar
    if "public" not in comando.replace("\\", "/"):
        return

    cwd = ""
    for seg in segmentos(comando):
        tokens = tokens_de(seg)
        if not tokens:
            continue
        m = REDIRECAO.search(seg)
        if m and toca(m.group(1), cwd):
            bloquear(f"redirecionamento (> ou >>) para dentro de public/data -> '{seg}'")
        cwd = novo_cwd(cwd, tokens)
        cmd = tokens[0].rsplit("/", 1)[-1]
        # `sudo cmd ...`, `env X=1 cmd ...`, `command cmd ...`
        while cmd in {"sudo", "env", "command", "nohup", "time", "nice"} and len(tokens) > 1:
            tokens = tokens[1:]
            while tokens and "=" in tokens[0] and not tokens[0].startswith("-"):
                tokens = tokens[1:]
            if not tokens:
                break
            cmd = tokens[0].rsplit("/", 1)[-1]
        if not tokens:
            continue
        args = tokens[1:]
        # dentro da pasta, qualquer comando destrutivo já toca nela (`rm -rf *`)
        dentro = PASTA in cwd
        if not dentro and not any(toca(t, cwd) for t in args):
            continue

        if cmd in DESTRUTIVOS:
            bloquear(f"`{cmd}` em public/data -> '{seg}'")
        if cmd in MOVEM and (dentro or any(toca(t, cwd) for t in args)):
            bloquear(f"`{cmd}` tira ou põe arquivo em public/data -> '{seg}'")
        if cmd in COPIAM:
            destino = [a for a in args if not a.startswith("-")]
            if destino and toca(destino[-1], cwd):
                bloquear(f"`{cmd}` com destino em public/data -> '{seg}'")
            if cmd == "rsync" and any(a in args for a in ("--delete", "--remove-source-files")):
                bloquear(f"`rsync` apagando em public/data -> '{seg}'")
        if cmd in {"sed", "perl"} and any(a == "-i" or a.startswith("-i") for a in args):
            bloquear(f"`{cmd} -i` edita public/data no lugar -> '{seg}'")
        if cmd == "git" and args and args[0] in {"rm", "mv", "clean"}:
            bloquear(f"`git {args[0]}` em public/data -> '{seg}'")
        if cmd in {"node", "python", "python3", "deno", "bun"} and ESCRITA_INLINE.search(seg):
            bloquear(f"código inline que escreve em public/data -> '{seg}'")
        if cmd in {"gzip", "gunzip", "zstd", "xz", "brotli", "sharp", "cwebp", "convert", "magick"}:
            bloquear(f"`{cmd}` reescreve arquivo de public/data -> '{seg}'")


def julgar_arquivo(tool_input):
    caminho = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
    if toca(caminho):
        bloquear(f"edição direta de '{caminho}'")


def main():
    try:
        dados = json.load(sys.stdin)
    except Exception:
        return 0
    tool = dados.get("tool_name")
    entrada = dados.get("tool_input", {}) or {}
    if tool == "Bash":
        julgar_bash(entrada.get("command", "") or "")
    elif tool == "PowerShell":
        julgar_powershell(entrada.get("command", "") or "")
    elif tool in {"Edit", "Write", "MultiEdit", "NotebookEdit"}:
        julgar_arquivo(entrada)
    return 0


if __name__ == "__main__":
    sys.exit(main())
