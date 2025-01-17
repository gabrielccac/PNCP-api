const puppeteer = require('puppeteer');

exports.scrapeData = async (req, res) => {
    let browser;
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                message: 'URL is required in the request body.',
            });
        }

        console.log(`Navigating to URL: ${url}`);

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
            ignoreDefaultArgs: ['--disable-extensions'],
        });

        const page = await browser.newPage();

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 60000,
        });

        // Extract the required information
        const extractedData = await page.evaluate(() => {
            const getText = (queryText) => {
                const element = [...document.querySelectorAll('p')]
                    .find(p => p.querySelector('strong')?.textContent.includes(queryText))
                    ?.querySelector('span');
                return element ? element.textContent.trim() : null;
            };

            return {
                local: getText('Local'),
                orgao: getText('Órgão'),
                modalidade: getText('Modalidade da contratação'),
                amparoLegal: getText('Amparo legal'),
                tipo: getText('Tipo'),
                modoDisputa: getText('Modo de disputa'),
                registroPreco: getText('Registro de preço'),
                dataInicioPropostas: getText('Data de início de recebimento de propostas'),
                dataFimPropostas: getText('Data fim de recebimento de propostas'),
                idContratacao: getText('Id contratação PNCP'),
                fonte: getText('Fonte'),
                unidadeCompradora: (() => {
                    const element = [...document.querySelectorAll('p')]
                        .find(p => p.querySelector('strong')?.textContent.includes('Unidade compradora'));
                    const span = element?.querySelectorAll('span')[1];
                    return span ? span.textContent.trim() : null;
                })(),
                objeto: (() => {
                    const element = [...document.querySelectorAll('p')]
                        .find(p => p.querySelector('strong')?.textContent.includes('Objeto'))
                        ?.nextElementSibling?.querySelector('span');
                    return element ? element.textContent.trim() : null;
                })(),
                valorTotalEstimado: (() => {
                    const element = [...document.querySelectorAll('div')]
                        .find(div => div.querySelector('strong')?.textContent.includes('VALOR TOTAL ESTIMADO DA COMPRA'))
                        ?.querySelector('span');
                    return element ? element.textContent.trim() : null;
                })(),
            };
        });

        // Extract download links and include them in the response
        const downloadLinks = await page.evaluate(() => {
            return [...document.querySelectorAll('a[aria-label="Fazer download"]')]
                .map(link => link.href)
                .filter(href => href)
                .filter(link => {
                    const url = new URL(link);
                    return url.searchParams.get('ignorarExclusao') !== 'false';
                });
        });

        res.json({
            data: extractedData,
            downloadLinks
        });

    } catch (error) {
        console.error('Error scraping data:', error);
        res.status(500).json({
            message: 'Error scraping data',
            error: error.message,
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};