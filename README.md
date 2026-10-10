# PPGA Interativo

Teses e dissertações do Programa de Pós-Graduação em Administração da Universidade Presbiteriana Mackenzie, transformadas em apresentações interativas em linguagem simples.

Site: https://ailabmack.github.io/ppga-interativo/

## Estrutura

```
index.html            página do projeto e índice de trabalhos
sobre/                página "Sobre o projeto"
en/                   versão em inglês, espelhando a mesma estrutura (en/index.html, en/sobre/, en/teses/...)
assets/               motor compartilhado das apresentações (motor.css, motor.js)
dados/linhas.json     linhas de pesquisa e docentes do PPGA
teses/                uma pasta por tese de doutorado
dissertacoes/         uma pasta por dissertação de mestrado
```

Cada trabalho fica em sua própria pasta, nomeada `ANO-sobrenome-tema`, com:

- `index.html`: a apresentação interativa (HTML, CSS e JS puros, sem build), que carrega o motor de `../../assets/`
- `meta.json`: os metadados usados no índice (título, autor, orientador, linha, ano, nível, palavras-chave, resumo)
- `tese.pdf` ou `dissertacao.pdf` (opcional): o texto completo. Se não houver PDF, preencha `link` no `meta.json` com o endereço do repositório institucional.

### Campos do `meta.json`

| Campo | Exemplo |
|---|---|
| `slug` | `2025-garran-reputacao-legitimidade` (igual ao nome da pasta) |
| `nivel` | `doutorado` ou `mestrado` |
| `titulo`, `titulo_curto`, `chamada` | título completo, título da capa e uma frase de chamada |
| `autor`, `orientador`, `coorientador` | nomes completos (`coorientador` pode ser `null`) |
| `linha` | `FE`, `GHSO` ou `CEI` (ver `dados/linhas.json`) |
| `ano` | `2025` |
| `palavras_chave` | lista de termos |
| `resumo` | um parágrafo em linguagem simples |
| `ods` | até 3 ODS da ONU, do mais próximo ao menos: `[{"n": 9, "meta": "9.5", "motivo": "..."}]` (aparecem no card e na capa) |
| `en` | textos em inglês: `titulo`, `titulo_curto`, `chamada`, `resumo`, `palavras_chave`, `ods_motivo` (um por item de `ods`) |
| `pdf` | caminho relativo do PDF, ex. `tese.pdf`, ou `null` |
| `link` | URL externa do texto completo, ou `null` |

## Skill para novos trabalhos

`.claude/skills/tese-interativa/` contém a skill do Claude Code que guia a transformação de uma tese ou dissertação numa apresentação interativa: extração do texto, roteiro, visualizações, construção, verificação e publicação. Ela é atualizada a cada novo trabalho (`references/licoes.md` guarda preferências, soluções e histórico).

Para usá-la em qualquer pasta, crie um atalho na pasta de skills pessoais:

```bash
ln -s "$(pwd)/.claude/skills/tese-interativa" ~/.claude/skills/tese-interativa
```

## Visualizar localmente

Abra `index.html` no navegador ou sirva a pasta com `python3 -m http.server`.
