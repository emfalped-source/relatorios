# Relatórios EMFAL

Relatórios de desenvolvimento dos estudantes da Escola Municipal Francisca Alves (EMFAL).

- Entrada com o mesmo usuário e senha do Corretor EMFAL.
- Cada professor marca as opções do seu componente; o app junta tudo num relatório único do estudante.
- Aba Folhas: gera folhas em PDF com QR Code (uma por estudante) para o professor que prefere o papel: ele marca à caneta, escreve a consideração à mão e entrega à coordenação, que fotografa a folha no app; o app lê as marcações, mostra o recorte do texto escrito para digitar e salva no nome do professor (folha.js).
- Relatório pronto editável: a coordenação ou o professor corrige o texto na folha e toca em Salvar edição; a versão editada abre para todos que têm acesso ao estudante (aba Edicoes da planilha). Descartar edição volta ao texto montado pelos registros.
- Corrigir marcações: na tela do relatório, o botão "Corrigir <componente>" reabre o registro com as opções marcadas para trocar a que saiu errada. O professor corrige os próprios registros; a coordenação corrige qualquer um (inclusive os lidos das folhas), e o registro continua no nome do professor.
- Histórico do estudante: na aba Relatórios, ao tocar no nome do estudante aparecem todos os períodos e anos com registros ou relatório salvo, inclusive relatórios antigos importados (salvos como versão editada do período).
- Lado humano: seção "Vínculos, bem-estar e contexto de vida" (vínculos, bem-estar, situações de vulnerabilidade e ações de cuidado e de rede). O relatório abre com "Quem é o estudante", pelas potencialidades, chama o estudante pelo nome e fecha com uma frase de compromisso da escola.
- Informações reservadas: vulnerabilidade e ações de rede só entram na versão de uso interno. Na tela do relatório, "Para quem é o relatório" > Família ou outra instituição refaz o texto sem elas (essa versão não pode ser salva por cima da interna). Esses itens também não vão para a folha impressa.
- Folhas impressas antes desta mudança (versão 1 do QR Code) continuam sendo lidas com o layout antigo.
- Os registros ficam numa planilha do Google Drive da escola, nunca neste repositório.

Endereço: https://emfalped-source.github.io/relatorios/
