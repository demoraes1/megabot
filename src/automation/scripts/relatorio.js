// Converte a lista de todos os elementos 'span' da página em um array
const allSpans = Array.from(document.querySelectorAll('span'));

// Encontra o primeiro 'span' cujo texto seja exatamente "Relatório"
const reportSpan = allSpans.find(span => span.textContent.trim() === 'Relatório');

// Verifica se o elemento foi encontrado
if (reportSpan) {
  // Encontra o elemento 'li' (item de lista) pai mais próximo, que é o item de menu clicável
  const menuItem = reportSpan.closest('li');
  
  if (menuItem) {
    // Simula o clique no item de menu
    menuItem.click();
    console.log('Sucesso: O elemento "Relatório" foi clicado.');
  } else {
    console.error('Erro: Não foi possível encontrar o item de menu (li) clicável associado a "Relatório".');
  }
} else {
  console.error('Erro: Nenhum elemento com o texto "Relatório" foi encontrado na página.');
}