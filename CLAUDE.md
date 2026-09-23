# Regras e Restrições Estritas (MUITO IMPORTANTE)

## 0. Fluxo de merge na main
- Toda funcionalidade nova ou correção começa em uma branch própria, criada a partir da `dev`. Nunca desenvolva direto em cima de `dev` ou `main`.
- O merge dessa branch acontece primeiro na `dev` (nosso ambiente de teste). Só depois de validado ali, a `dev` é mesclada na `main`.
- Antes de qualquer merge na `main`, siga obrigatoriamente o protocolo completo definido em [CODE_REVIEW.md](CODE_REVIEW.md). Este arquivo (CLAUDE.md) é a fonte de verdade das regras de código; o CODE_REVIEW.md define como validá-las e aprovar ou reprovar a alteração.
- Sempre que o merge na `main` vier de uma branch que não seja a `dev`, alinhe a `dev` com a `main` logo em seguida, no mesmo fluxo, para que as duas não divirjam.
- A branch `dev` nunca deve ser apagada, nem mesmo depois de mesclada na `main`.

## 1. Entrega
- Nenhum comentário no código: proibido `//`, `/* */`, `#`, docblocks ou JSDoc. Entregue o código completamente limpo.
- Sigilo absoluto: não gere, sugira ou mencione arquivos de configuração (como `.claude` ou `.claudepass`). Não crie mensagens de commit, não sugira comandos de Git (commit/push). Aja estritamente gerando os trechos de código solicitados.
- Nunca se atribua autoria: é proibido adicionar `Co-Authored-By`, assinatura, menção à IA ou qualquer rodapé de crédito em mensagens de commit, pull requests ou comentários.
- Não explique o código gerado, a menos que seja pedido.

## 1.1. Responsividade (MUITO IMPORTANTE)
- Toda tela, componente ou ajuste entregue precisa estar 100% funcional e legível no celular. O acesso mobile é o principal do produto.
- Layout parte do menor tamanho de tela e cresce a partir dele; use as variações responsivas do Tailwind (`sm:`, `lg:`) para adaptar, nunca para consertar.
- Nada de rolagem horizontal na página. Conteúdo largo (tabela, lista, diagrama) rola dentro do próprio contêiner.
- Botões de ação precisam continuar alcançáveis sem rolagem longa, principalmente em gaveta e modal. Prenda-os ao rodapé quando a lista puder crescer.
- Campo de texto não pode deixar o teclado virtual aberto depois de enviar; tire o foco ao concluir a ação.
- Imagem gerada para compartilhamento deve respeitar a proporção do destino (story usa 9:16), sem sobra de fundo.

## 1.2. Visão de negócio e instrumentação (MUITO IMPORTANTE)
- Funcionalidade nova só está pronta quando dá para responder **se está sendo usada**. Antes de encerrar, declare qual pergunta de negócio a entrega passa a responder e por onde ela é medida.
- Antes de criar evento novo, verifique se o dado **já é derivável** das tabelas existentes. Compartilhamento, substituição e sessão de treino, por exemplo, já ficam registrados em tabela própria — evento ali seria redundante e vira duas fontes de verdade para o mesmo número.
- Quando a funcionalidade envolve o usuário **escolhendo** entre opções, registre a escolha, não apenas que a ação aconteceu. Saber que houve troca de exercício vale pouco; saber se foi para a opção com aparelho ou sem, e se foi temporária ou definitiva, é o que gera decisão de produto.
- Toda métrica precisa de origem estável no banco. Não dependa de texto que o usuário pode editar para identificar registro: use chave estrangeira. Métrica que quebra em silêncio quando alguém renomeia algo é pior que métrica ausente.
- Instrumentação nunca pode derrubar ou travar a experiência: registro de evento é disparado sem bloquear a ação, com falha silenciosa.
- Métrica é interna. Nada de rastreio aparecendo na interface do usuário, e a tabela de eventos permanece sem política de leitura para o app — só a chave de servidor enxerga.
- Colete apenas o que responde a uma pergunta real. Sem dado pessoal além do necessário e sem evento criado "por precaução".
- Ao adicionar evento, tela ou coluna que alimente métrica, **atualize o mapeamento** que o painel consome, para que a lista de tipos e telas continue completa.

## 2. Padrão do projeto
- Siga estritamente o padrão estrutural e de nomenclatura já existente no projeto.
- Antes de criar qualquer helper, constante ou utilitário, verifique se já existe algo equivalente no projeto e reutilize.
- Na dúvida entre duas abordagens, escolha a que já aparece no código existente.

## 3. Idioma e nomenclatura
- Todo código gerado (variáveis, métodos, funções, classes, IDs) em Português do Brasil (pt-BR).
- Exceções que permanecem no original: palavras-chave da linguagem, APIs de framework/biblioteca, nomes de pacotes e campos que espelham contratos externos (API, banco legado).
- Nomes devem ser descritivos e sem abreviações (`quantidadeDeItens`, não `qtdItens` ou `qi`).
- Booleanos com prefixo de predicado: `estaAtivo`, `possuiPermissao`, `deveNotificar`, `podeEditar`.
- Funções começam com verbo: `calcularTotal`, `buscarUsuarioPorId`, `validarCpf`.

## 4. Fluxo de controle
- Early return obrigatório. Trate erros, casos inválidos e casos-limite no topo da função e retorne imediatamente.
- Proibido `else` após um `return`. Se o `if` retorna, o código seguinte fica no nível de cima.
- Máximo de 2 níveis de indentação dentro de uma função. Se passar disso, extraia uma nova função.
- Proibido `if/else if` encadeado com 3 ou mais ramos. Substitua por: mapa/objeto de lookup, `switch`/`match`, tabela de estratégias ou polimorfismo.
- Inverta condições negativas para reduzir aninhamento (`if (!ehValido) return;`).
- Nunca aninhe `try/catch` dentro de laços quando puder tratar fora.

## 5. Constantes e valores mágicos
- Proibido literal mágico (número, string ou array fixo) direto no meio da lógica.
- Valor usado em mais de um lugar, ou que representa um conjunto fechado de opções → Enum (ou o equivalente idiomático da linguagem: enum, union type, constante congelada).
- Valor de configuração, limite, timeout, chave ou mensagem → constante nomeada no topo do arquivo, em `SCREAMING_SNAKE_CASE`.
- Constante compartilhada entre arquivos → arquivo dedicado de constantes/enums, seguindo onde o projeto já guarda isso.
- Comparações de status, tipo ou papel sempre contra membro de Enum, nunca contra string literal.

## 6. Repetição e tamanho
- DRY: se o mesmo bloco lógico aparecer 2 vezes, extraia. Não duplique nem por conveniência.
- Função com no máximo ~20 linhas e uma única responsabilidade.
- Máximo de 3 parâmetros por função; acima disso, receba um objeto/DTO.
- Em laços, prefira as operações idiomáticas da linguagem (`map`, `filter`, `reduce`, `some`, `every`, comprehensions) quando expressarem melhor a intenção que um `for` manual.
- Não faça duas passagens sobre a mesma coleção quando uma resolve.

## 7. Estado e efeitos
- Prefira imutabilidade: `const`/`final`/`readonly` por padrão; `let`/`var` só quando houver reatribuição real.
- Não mute parâmetros recebidos nem estruturas compartilhadas; retorne novos valores.
- Declare variáveis o mais perto possível do uso, nunca todas no topo da função.
- Separe cálculo de efeito colateral: funções que decidem não devem ser as que gravam/imprimem/chamam API.

## 8. Segredos e dados sensíveis (MUITO IMPORTANTE)
- **Nunca exibir valor de segredo.** É proibido imprimir, ecoar, logar ou reproduzir em resposta qualquer credencial: chave de API, token de acesso, senha, connection string, JWT ou segredo de webhook. Isso vale para saída de terminal, mensagem de commit, log de aplicação e texto de resposta.
- **Nunca ler arquivo de segredo para exibir.** Não abra `.env`, `.env.local` ou equivalente para mostrar conteúdo. Referencie a variável pelo nome (`VITE_SUPABASE_ANON_KEY`), nunca pelo valor.
- **Segredo não entra no repositório.** Vive apenas em variável de ambiente e em arquivo ignorado pelo Git. Proibido em código-fonte, migration, seed, teste, fixture ou documentação.
- **Antes de commitar, conferir o que está no stage** e abortar se houver arquivo de credencial.
- **Separação cliente/servidor:** apenas a chave pública (`anon` do Supabase) pode ir para o bundle do front, e somente com Row Level Security ativa em todas as tabelas. Chave `service_role` e chaves de API de IA existem apenas em código de servidor.
- **Ao depurar, mascarar.** Se precisar confirmar que uma variável está definida, verifique apenas presença e comprimento, ou exiba no máximo os 4 últimos caracteres.
- **Não enviar dado de usuário ou credencial para serviço de terceiro** que não seja um já aprovado no projeto.
- **Erro não vaza segredo.** Mensagens de erro e telas de falha não devem conter credencial, query completa com dado sensível ou detalhe interno de infraestrutura.
