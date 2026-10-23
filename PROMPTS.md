# AI usage and prompts

This project was built with **Claude Code** (model: Claude Opus 5.5) as a pair
programmer. The AI wrote most of the code, tests and docs. I made the design
decisions (the AI asked me about the main ones and proposed the smaller
ones), reviewed the code, asked for explanations and changes, and tested the
app in the browser.

Below are the prompts that shaped the project, in the order I sent them
(in Portuguese, the language I worked in). I lightly edited spelling,
punctuation and length, without changing what was asked. Each one has a short
English summary of what it asked for and what came out of it. Where the AI asked
a multiple-choice question, my answers are listed as **Decisions**.

Some messages were left out: environment setup (installing Node 24 with nvm)
and questions about how specific parts of the code work. Those questions are
summarized at the end, followed by a short reflection.

---

## 1. Kick-off: backend

> Preciso criar uma aplicação full-stack de calculadora. Seguem abaixo as especificações:
>
> _[the full assignment specification was pasted here]_
>
> Dadas as orientações, criei um diretório "backend" e um "frontend" e inicializei o git. Comece o desenvolvimento, por ora apenas do back-end, sabendo que será em Go. Crie os primeiros arquivos e me consulte em caso de alguma dúvida ou decisão de projeto.

_Start with the Go backend only, and ask me about design decisions._

**Decisions**

- API shape: **one endpoint per operation** (`POST /api/v1/add`, …), rather than a generic `/calculate` endpoint or an expression evaluator.
- Router: **standard library `net/http`**, rather than chi or gin.
- Optional operations: **power, square root and percentage**, all three.
- Number type: **`float64`**, rather than an arbitrary-precision decimal library.

**Result:** the Go module with the domain package, HTTP handlers, middleware
(CORS, logging, panic recovery), graceful shutdown, table-driven tests, a
Makefile, a Dockerfile and the backend README.

## 2. Holding the commit for review

> Ainda não, quero revisar o código antes do commit.

_Don't commit yet; I want to review the code first._

## 3. Reviewing `handler.go`

> Achei o handler.go muito extenso. Muita coisa ali achei que a validação já era automática, por exemplo, o endpoint POST aceitar apenas requisições POST. Realmente precisa de tudo isso? E se eu utilizasse algum framework evitaria muito do que está aí ou não, é essencial de toda forma?

_`handler.go` looks long. Isn't validation such as POST-only automatic? Would a
framework remove much of it?_

**Result:** an explanation. Go's `ServeMux` does return 405 automatically; the
extra code was only there to keep every error response in JSON and to give
specific validation messages. A framework such as Gin would save roughly
30–40 lines, but the pointer fields that detect missing operands would still be
needed. The AI proposed a slimmer version (about 70 lines instead of 162).

> Pode deixar como está mesmo.

**Decision:** keep the stricter version, with JSON errors everywhere and
detailed messages.

## 4. Backend gap check

> Segundo a especificação inicial que te enviei, acha que o back-end já está concluído então? Reveja e perceba se deixou algo passar, ou se já podemos ir para o front-end.

_Check the backend against the specification. Is anything missing?_

**Result:** a gap analysis. Still missing were coverage numbers in the docs, the
root README, the full-stack Docker setup and this file.

## 5. Frontend

> Vamos para o frontend! Pode iniciar. Vai ser em React, conforme descrito, e pensei em usar Tailwind para o visual.

_Start the React frontend, styled with Tailwind._

**Decisions**

- UI model: **a pocket-calculator keypad**, rather than a two-field form.
- API access: **a same-origin `/api` proxy** (Vite in development, nginx in Docker), rather than a configurable API URL.
- Extras: **physical keyboard support and a calculation history**.
- Environment: the installed Node 23 is end-of-life and unsupported by current
  Vitest, so I agreed to **install Node 24 LTS via nvm** and pin it with `.nvmrc`.

**Result:** a Vite + React + TypeScript app with a pure reducer for the keypad
logic, a typed API client, and unit and component tests (Vitest + React Testing
Library).

## 6. Operator precedence

> Uma dúvida: eu não conseguiria fazer, por exemplo, 3 + 5 x 2? Porque ele já faz as operações na ordem, ficando 8 x 2 = 16, ao invés do correto, 3 + 10 = 13. Por isso, pensei se preciso ter parênteses na calculadora. Se for adicionar, não sei se quebraria o layout, e se mudaria algo no back-end ou não haveria necessidade. Não precisa mudar nada ainda, só me ajude a pensar sobre isso.

_`3 + 5 × 2` gives 16, not 13. Do we need precedence or parentheses? Would it
affect the layout or the backend?_

**Result:** four options were compared: (A) keep immediate execution and
document it, (B) or (C) precedence (and parentheses) computed in the frontend,
(D) a backend `/evaluate` endpoint with a parser.

## 7. Scope decision and remaining work

> Vamos de A! Agora, reveja a especificação inicial e liste o que falta, para que nós vejamos o que fazer a seguir.

**Decision:** **option A**, immediate execution documented as a design
decision. _Then list what is still missing from the specification._

**Result:** a numbered list of the remaining work, referenced by the next
prompts:

1. Test the app in the browser
2. Frontend README
3. Root README
4. Coverage report
5. Full-stack Docker setup
6. This file
7. Commits and push

## 8. Docker

> Tópico 1 está feito. Pode fazer o 5.

_Browser testing is done (by me). Build the full-stack Docker setup._

**Result:** a multi-stage frontend Dockerfile (Node build, then nginx), an nginx
config that proxies `/api` to the backend, and `docker-compose.yml`.

## 9. Documentation

> Sim, pode fazer os itens 2, 3 e 4 (READMEs e cobertura).

**Result:** the frontend and root READMEs, and coverage numbers for both layers.

## 10. This file

> Sim, pode fazer o PROMPTS.md.

**Result:** the first version of this file.

## 11. Code formatting

_Summarized:_ the Vite template writes TypeScript without semicolons, and I
prefer them. I asked to add **Prettier** configured with semicolons, so that the
style is enforced by a tool rather than by hand.

**Result:** Prettier with `semi: true`, single quotes and a 120-column limit;
`npm run format` and `npm run format:check` scripts; the whole frontend
reformatted, with tests, lint and build still passing.

## 12. Folder structure

> Agora, sobre a divisão do projeto front-end. Acho que eu não teria criado uma pasta "calculator". Talvez meu useCalculator teria ficado na pasta hooks. Faria sentido ou não? O format e as messages eu provavelmente teria colocado em uma pasta utils. E o state eu possivelmente teria deixado misturado com o useCalculator. Considerando que eu faria diferente essa divisão de diretórios, tem outra(s) divisão(ões) que você acha que seriam corretas também, mas mais próximas do meu raciocínio? Não precisa alterar, apenas proponha por ora.

_The `calculator/` feature folder isn't how I would organize it. Propose
alternatives that are closer to how I think, without changing anything yet._

**Result:** three options: (A) group by kind (`hooks/`, `reducers/`, `utils/`),
(B) the same, with the reducer next to its hook, or (C) keep the current
feature folder.

> Pode aplicar a opção A, por favor.

**Decision:** **option A**, grouping by kind of file.

**Result:** `useCalculator` moved to `hooks/`, the reducer to
`reducers/calculatorReducer.ts`, and formatting and error messages to `utils/`.
Imports and README updated; no logic changed and all tests still pass.

---

## Learning questions (summarized)

While reviewing the code, I asked the AI to walk me through how specific parts
were implemented and why, instead of accepting them as they were:

- **Test strategy:** how the tests are split in each layer (pure unit tests for the
  domain logic, `httptest` handler tests in Go, component tests with a fake API
  in React), and which lines the API coverage leaves out and why.
- **`useReducer`:** how it differs from `useState` with an object, and a
  step-by-step walkthrough of every action and state field in the reducer
  (including `fresh` vs. `awaitingOperand`).
- **Dependency injection:** how passing the API client as a prop lets the
  component tests run without the backend.
- **The `/api` proxy:** how relative URLs, the Vite dev proxy and nginx route
  requests to the Go service.
- **Async flow in the hook:** why calculations are started with `void` rather than
  awaited, and how their results reach the UI through `dispatch`.

---

## Reflection

**How I worked.** I let the AI write most of the code and focused on steering:
choosing between the options it proposed, questioning what looked
overcomplicated, and checking the result against the specification. It was
faster than writing everything by hand, but it also meant code reached me
before I fully understood it. Reviewing it afterwards took real time.

**Where my input changed the outcome.** I noticed that `3 + 5 × 2` gave 16. The
AI had built an immediate-execution calculator without pointing that out, and I
made the scope decision explicit and documented it. I questioned the size of
`handler.go` before accepting it, and reorganized the frontend folders to match
how I reason about a codebase. I also held every commit until I had reviewed
the code.

**What the AI had to correct.** Its first `npm install` resolved an outdated
Vitest with known vulnerabilities. The AI caught this, pinned Vitest 5, and
that in turn required moving from Node 23 to Node 24 LTS. It also revised its
own keypad logic so that `√` doesn't discard a pending operation. A reminder
that generated code needs the same review as anyone else's.

**What I learned.** Structuring UI state as a pure reducer, so the rules can be
tested without rendering anything. Injecting the API client so components can
be tested without the backend. Serving the frontend and the API from the same
origin through a proxy.

**What I'd do differently.** Start with a short brief that states the
constraints and acceptance criteria instead of open-ended requests. Ask for a
plan before any code. Review each layer file by file as it is produced, rather
than after the fact. Write some parts myself and ask the AI to review them.
