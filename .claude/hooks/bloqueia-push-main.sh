#!/usr/bin/env python3
"""PreToolUse hook (Bash) do Claude Code.

A única forma de `git push` permitida sem perguntar ao dono é
`git push <remoto> main:backup`. Push na `main` PUBLICA o site (o deploy.yml
roda a cada push nela); push forçado ou apagando ramo é irreversível.

Entrada: JSON no stdin ({tool_name, tool_input:{command}}).
Saída: exit 0 deixa passar; exit 2 bloqueia e mostra o motivo (stderr) ao agente.
"""
import json
import re
import shlex
import sys

PERMITIDO = "Permitido sem perguntar: 'git push origin main:backup'. Push na main publica o site; peça ao dono."
FORCA = {"-f", "--force", "--delete", "-d"}
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
            args = tokens[i + 1:]
            if any(a in FORCA or a.startswith("--force-with-lease") for a in args):
                bloquear(f"push forçado ou apagando ramo -> '{seg}'")
            if any(a.startswith("+") for a in args):
                bloquear(f"refspec com '+' força o push -> '{seg}'")
            alvos = [a for a in args if not a.startswith("-")]
            # sem refspec = ramo atual para o upstream, que é a main
            if len(alvos) != 2 or alvos[1] != "main:backup":
                bloquear(f"push sem destino main:backup -> '{seg}'")
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
