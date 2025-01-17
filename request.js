const axios = require('axios');

// Configuração base do axios
const api = axios.create({
    baseURL: 'http://localhost:3000'
});

// Função para testar o endpoint de scraping
async function testScrape(url) {
    try {
        console.log('Testando endpoint de scraping...');
        const response = await api.post('/scrape', { url });
        console.log('Dados extraídos com sucesso:');
        console.log(JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('Erro ao fazer scraping:', error.response?.data || error.message);
        throw error;
    }
}

// Função para testar o endpoint de download
async function testDownload(downloadLinks) {
    try {
        console.log('Testando endpoint de download...');
        const response = await api.post('/download', { downloadLinks });
        console.log('Arquivos baixados com sucesso:');
        console.log(`Total de arquivos: ${response.data.files.length}`);
        console.log('Nomes dos arquivos:');
        response.data.files.forEach(file => console.log(`- ${file.name}`));
        return response.data;
    } catch (error) {
        console.error('Erro ao fazer download:', error.response?.data || error.message);
        throw error;
    }
}

// Função principal que testa todo o fluxo
async function testFullFlow(url) {
    try {
        // Primeiro faz o scraping
        const scrapeResult = await testScrape(url);
        
        // Se houver links de download, faz o download
        if (scrapeResult.downloadLinks && scrapeResult.downloadLinks.length > 0) {
            await testDownload(scrapeResult.downloadLinks);
        } else {
            console.log('Nenhum link de download encontrado.');
        }
    } catch (error) {
        console.error('Erro no fluxo completo:', error.message);
    }
}

// Exemplo de uso
const testUrl = 'https://pncp.gov.br/app/editais/87612859000130/2024/37'; // Substitua pela URL que você quer testar

// Executar os testes individualmente
// testScrape(testUrl);
// testDownload(['URL_DO_ARQUIVO_1', 'URL_DO_ARQUIVO_2']);

// Ou executar o fluxo completo
testFullFlow(testUrl);