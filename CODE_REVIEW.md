# Protocolo Obrigatório de Code Review — Antes do Merge na Main

Este protocolo deve ser executado **obrigatoriamente antes de qualquer merge na `main`**.

As regras e restrições definidas em `CLAUDE.md` são a **fonte de verdade** e devem ser consideradas em todas as etapas deste protocolo. Não é necessário reproduzi-las ou modificá-las aqui.

## 1. Análise inicial

Antes de revisar o código:

1. Identifique exatamente quais arquivos foram alterados.
2. Analise o contexto das alterações e o objetivo da implementação.
3. Leia os arquivos alterados por completo quando necessário para compreender o contexto.
4. Consulte as implementações existentes relacionadas à alteração.
5. Verifique se a solução segue o padrão arquitetural já utilizado no projeto.
6. Procure implementações, helpers, métodos, constantes, enums ou utilitários existentes que possam ser reutilizados.
7. Não proponha uma nova abstração quando já existir uma solução equivalente no projeto.

## 2. Validação das regras do projeto

Para cada alteração realizada, valide obrigatoriamente todas as regras presentes no `CLAUDE.md`.

A revisão deve identificar qualquer violação relacionada a:

* nomenclatura;
* idioma;
* estrutura;
* arquitetura;
* fluxo de controle;
* early return;
* níveis de indentação;
* `else` desnecessário;
* duplicação de código;
* tamanho e responsabilidade das funções;
* quantidade de parâmetros;
* valores mágicos;
* constantes;
* enums;
* mutabilidade;
* efeitos colaterais;
* reutilização de código existente;
* comentários proibidos;
* qualquer outra restrição definida no arquivo de regras.

**Não considere uma violação aceitável apenas porque o código funciona.**

Código funcional que viola uma regra estabelecida deve ser apontado e corrigido antes do merge.

## 3. Análise de arquitetura

Verifique se a alteração está posicionada na camada correta.

Avalie:

* responsabilidade de cada classe;
* responsabilidade de cada método;
* separação entre regras de negócio e infraestrutura;
* dependências entre camadas;
* acoplamento desnecessário;
* inversão de dependência;
* reutilização de componentes existentes;
* consistência com os padrões arquiteturais já utilizados no projeto.

Não introduza novos padrões arquiteturais apenas para resolver um problema pontual.

A solução deve ser consistente com a arquitetura existente.

## 4. Análise de lógica

Verifique se a implementação:

* atende exatamente ao comportamento esperado;
* trata entradas inválidas;
* trata `null` quando aplicável;
* trata coleções vazias;
* trata valores inesperados;
* trata limites;
* evita estados inconsistentes;
* não possui condições redundantes;
* não possui caminhos de execução impossíveis;
* não possui código inalcançável;
* não possui efeitos colaterais inesperados.

Procure especialmente por erros que não aparecem no fluxo principal, mas podem ocorrer em produção.

## 5. Análise de segurança

Verifique possíveis problemas relacionados a:

* entrada de usuário;
* SQL Injection;
* exposição de informações sensíveis;
* dados retornados indevidamente;
* validação de permissões;
* autenticação e autorização;
* manipulação de tokens;
* logs contendo informações sensíveis;
* credenciais ou segredos inseridos no código;
* dados externos não validados;
* endpoints sem as proteções necessárias.

Caso encontre risco de segurança, classifique como prioridade alta.

## 6. Análise de banco de dados

Quando houver interação com banco, valide:

* queries;
* parâmetros;
* filtros;
* joins;
* índices quando relevantes;
* possibilidade de consultas desnecessariamente pesadas;
* risco de N+1;
* transações;
* concorrência;
* locks;
* consistência dos dados;
* tratamento de exceções;
* mapeamento entre banco e código;
* tipos nullable e não-nullable;
* compatibilidade com a estrutura existente.

Verifique também se a implementação pode causar problemas de performance em tabelas com grande volume de dados.

## 7. Análise de performance

Procure por:

* consultas desnecessárias;
* chamadas repetidas a APIs;
* processamento duplicado;
* múltiplas iterações evitáveis;
* carregamento desnecessário de grandes coleções;
* operações síncronas onde o projeto utiliza operações assíncronas;
* chamadas externas dentro de loops;
* criação desnecessária de objetos;
* processamento que poderia ser realizado uma única vez.

Não faça otimizações prematuras. Priorize problemas reais ou claramente evitáveis.

## 8. Análise de tratamento de erros

Verifique se:

* exceções são tratadas no local adequado;
* exceções não são engolidas silenciosamente;
* não existem `catch` genéricos desnecessários;
* mensagens de erro não expõem informações sensíveis;
* erros esperados possuem tratamento adequado;
* o comportamento em caso de falha é previsível;
* operações externas possuem tratamento de falha;
* recursos são liberados corretamente.

Não adicione tratamento de exceção apenas por formalidade.

## 9. Análise de concorrência e consistência

Quando houver operações de leitura e escrita, valide possíveis condições de corrida.

Procure especialmente por:

* leitura seguida de escrita sem proteção adequada;
* verificações de existência suscetíveis a concorrência;
* atualização simultânea do mesmo registro;
* operações que precisam ser atômicas;
* uso inadequado de transações;
* inconsistência entre estado lido e estado posteriormente atualizado.

## 10. Análise de testes

Verifique se a alteração possui cobertura de testes adequada ao comportamento modificado.

Avalie:

* cenário de sucesso;
* cenário de erro;
* entradas inválidas;
* valores nulos;
* valores vazios;
* limites;
* casos excepcionais;
* regressões em funcionalidades existentes.

Se não houver testes para uma alteração relevante, sinalize a ausência.

Não crie testes artificiais apenas para aumentar cobertura.

## 11. Análise de regressão

Antes de aprovar, verifique se a alteração pode quebrar funcionalidades existentes.

Procure:

* métodos reutilizados por outras funcionalidades;
* contratos existentes;
* APIs consumidas por outros sistemas;
* alterações em modelos compartilhados;
* alterações em queries utilizadas por múltiplos fluxos;
* mudanças de comportamento;
* alterações incompatíveis;
* impactos em código legado.

Sempre considere os consumidores existentes antes de alterar contratos.

## 12. Análise de código desnecessário

Identifique e questione:

* código morto;
* variáveis não utilizadas;
* imports desnecessários;
* métodos não utilizados;
* parâmetros desnecessários;
* abstrações sem necessidade;
* arquivos criados sem necessidade;
* duplicações;
* validações redundantes;
* dependências adicionadas sem necessidade.

A alteração deve conter somente o que é necessário para resolver o problema.

## 13. Comparação com o padrão existente

Antes de sugerir qualquer mudança estrutural, procure exemplos semelhantes no projeto.

A pergunta obrigatória é:

> "Como o projeto já resolve esse mesmo tipo de problema?"

Se existir uma implementação consolidada, priorize a mesma abordagem.

Evite introduzir:

* novos padrões;
* novas bibliotecas;
* novos helpers;
* novas abstrações;
* novas convenções;

quando uma solução equivalente já existir.

## 14. Classificação dos problemas

Todos os problemas encontrados devem ser classificados como:

### CRÍTICO

Impede o merge.

Exemplos:

* falha de segurança;
* corrupção ou perda de dados;
* quebra de contrato;
* erro funcional grave;
* violação direta de uma regra obrigatória;
* possibilidade clara de indisponibilidade;
* código que não compila.

### ALTO

Deve ser corrigido antes do merge.

Exemplos:

* bug funcional;
* tratamento incorreto de erro;
* problema relevante de performance;
* problema de concorrência;
* ausência de validação importante;
* regressão provável.

### MÉDIO

Deve ser corrigido antes do merge quando impactar qualidade, manutenção ou consistência do projeto.

Exemplos:

* duplicação;
* responsabilidade excessiva;
* abstração inadequada;
* inconsistência com padrão existente;
* complexidade desnecessária.

### BAIXO

Melhoria de qualidade sem impacto funcional relevante.

Não bloqueie o merge por problemas exclusivamente cosméticos.

## 15. Regra de aprovação

O merge para `main` somente poderá ser considerado aprovado quando:

* não houver problemas CRÍTICOS;
* não houver problemas ALTOS;
* todas as violações obrigatórias das regras do `CLAUDE.md` tiverem sido corrigidas;
* não houver regressão conhecida;
* o código estiver consistente com o padrão existente;
* a implementação estiver funcionalmente adequada;
* os testes necessários estiverem adequados;
* não houver código desnecessário introduzido pela alteração.

## 16. Formato obrigatório do resultado

Ao finalizar o review, apresente somente:

### Resultado

**APROVADO** ou **REPROVADO**

### Problemas encontrados

Para cada problema:

* **Prioridade:** CRÍTICO / ALTO / MÉDIO / BAIXO
* **Arquivo:** caminho do arquivo
* **Local:** método, classe ou trecho relevante
* **Problema:** descrição objetiva
* **Correção:** o que precisa ser alterado

Não elogie o código sem necessidade.

Não invente problemas.

Não classifique como problema algo que seja apenas preferência pessoal quando não houver regra do projeto, padrão existente ou impacto técnico que justifique a alteração.

## 17. Regra de decisão

Se houver qualquer dúvida sobre a aprovação, não aprove automaticamente.

Investigue o código existente, os usos da implementação e o impacto da alteração antes de decidir.

O objetivo do review não é apenas verificar se o código funciona.

O objetivo é garantir que o código:

**funcione corretamente + siga as regras do projeto + mantenha a arquitetura + seja seguro + seja sustentável + não introduza regressões.**

Somente após todas essas verificações o código poderá ser considerado pronto para merge na `main`.
