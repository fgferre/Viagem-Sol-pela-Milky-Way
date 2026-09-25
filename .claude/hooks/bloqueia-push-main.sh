#!/usr/bin/env python3
"""PreToolUse hook (Bash) do Claude Code.

`git push` sem perguntar ao dono só quando o DESTINO no remoto é explícito e
não é a `main`: `git push [-u] <remoto> <origem>[:<destino>]` — por exemplo
`git push origin main:backup`, `git push -u origin poeira-gaia` ou
`git push origin HEAD:poeira-gaia`. Push na `main` PUBLICA o site (o
deploy.yml roda a cada push nela); push forçado ou apagando ramo é
irreversível; `git push` sem refspec, `HEAD` sem destino, `--all`, `--tags`,
`--mirror` e opções parecidas não deixam julgar o destino, então não passam.
Revisto em 25/09/2026 a pedido do dono, para o trabalho em ramos.

Entrada: JSON no stdin ({tool_name, tool_input:{command}}).
Saída: exit 0 deixa passar; exit 2 bloqueia e mostra o motivo (stderr) ao agente.
"""
import json
import re
import shlex
import sys

PERMITIDO = (
    "Permitido sem perguntar: 'git push origin main:backup' e "
    "'git push [-u] origin <ramo>' (ou 'HEAD:<ramo>') para qualquer ramo que "
    "não seja main. Push na main publica o site; peça ao dono."
)
FORCA = {"-f", "--force", "--delete", "-d", "--force-if-includes"}
# opções que não mudam o destino; qualquer outra (--all, --tags, --mirror,
# -o, --repo…) não deixa julgar e barra
OPCOES_INOFENSIVAS = {"-u", "--set-upstream", "-q", "--quiet", "-v", "--verbose"}
NOME_DE_REF = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")
# `2>&1`, `>arq`, `2>/dev/null`, `&>arq` — e o operador solto (`> arq`)
REDIRECAO_COLADA = re.compile(r"^(\d*>&\d+|\d*>>?\S+|\d*<\S+|&>>?\S+)$")
REDIRECAO_SOLTA = re.compile(r"^(\d*>>?|\d*<|&>>?)$")
EXECUTORES = {
    "sh", "bash", "zsh", "dash", "eval", "exec", "env", "command",
    "xargs", "sudo", "nohup", "timeout", "time", "nice", "script",
}


def bloquear(motivo):
    print(f"BLOQUEADO pelo hook bloqueia-push-main: {motivo}", file=sys.stderr)
    print(PERMITIDO, file=sys.stderr)
    sys.exit(2)


def segmentos(comando):
    # cada comando encadeado vira um segmento: `a && b; c | d`
    return [s.strip() for s in re.split(r"\n|;|&&|\|\||\|", comando) if s.strip()]


def tokens_de(segmento):
    try:
        return shlex.split(segmento)
    except ValueError:
        return segmento.split()


def sem_redirecoes(args):
    """Tira `2>&1`, `> arquivo` etc.: não são remoto nem refspec."""
    saida = []
    pular = False
    for a in args:
        if pular:
            pular = False
            continue
        if REDIRECAO_SOLTA.match(a):
            pular = True  # o próximo token é o arquivo
            continue
        if REDIRECAO_COLADA.match(a):
            continue
        saida.append(a)
    return saida


def destino_de(refspec):
    """Ramo que o push escreve no remoto, ou None quando não dá para saber."""
    if ":" in refspec:
        origem, destino = refspec.split(":", 1)
        if not origem or not destino:
            return None  # `:ramo` apaga no remoto; `ramo:` não é refspec
        return destino
    if refspec == "HEAD":
        return None  # ramo atual: pode ser a main
    return refspec


def main():
    try:
        dados = json.load(sys.stdin)
    except Exception:
        return 0
    if dados.get("tool_name") != "Bash":
        return 0
    comando = dados.get("tool_input", {}).get("command", "") or ""
    if not re.search(r"\bgit\b", comando) or "push" not in comando:
        return 0

    for seg in segmentos(comando):
        tokens = tokens_de(seg)
        if not tokens:
            continue
        # `git [opções globais] push ...` — o segmento tem de COMEÇAR por git
        if tokens[0] == "git" and "push" in tokens:
            i = tokens.index("push")
            args = sem_redirecoes(tokens[i + 1:])
            if any(a in FORCA or a.startswith("--force-with-lease") for a in args):
                bloquear(f"push forçado ou apagando ramo -> '{seg}'")
            if any(a.startswith("+") for a in args):
                bloquear(f"refspec com '+' força o push -> '{seg}'")
            opcoes = [a for a in args if a.startswith("-")]
            if any(o not in OPCOES_INOFENSIVAS for o in opcoes):
                bloquear(f"opção de push que não deixa julgar o destino -> '{seg}'")
            alvos = [a for a in args if not a.startswith("-")]
            # sem remoto e refspec explícitos = ramo atual para o upstream, que pode ser a main
            if len(alvos) != 2:
                bloquear(f"push sem remoto e refspec explícitos -> '{seg}'")
            destino = destino_de(alvos[1])
            if destino is None or not NOME_DE_REF.match(destino):
                bloquear(f"destino do push não dá para julgar -> '{seg}'")
            if destino == "main" or destino.endswith("/main"):
                bloquear(f"push na main publica o site -> '{seg}'")
        elif tokens[0].rsplit("/", 1)[-1] in EXECUTORES and re.search(
            r"\bgit\s+(-\S+\s+(\S+\s+)?)*push\b", seg
        ):
            # push escondido num executor de shell (sh -c "git push ..."):
            # o hook não consegue julgar o destino, então não passa. Texto de
            # commit ou echo que só CITA um push não entra aqui.
            bloquear(f"push dentro de subshell, não dá para julgar o destino -> '{seg}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
