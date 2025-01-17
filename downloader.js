const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

exports.downloadFiles = async (req, res) => {
    const tempDir = path.join(os.tmpdir(), uuidv4());
    const downloadedFiles = [];

    try {
        const { downloadLinks } = req.body;

        if (!downloadLinks || !Array.isArray(downloadLinks) || downloadLinks.length === 0) {
            return res.status(400).json({
                message: 'Download links array is required in the request body.',
            });
        }

        // Criar diretório temporário
        fs.mkdirSync(tempDir, { recursive: true });

        console.log(`Worker ${process.pid} - Found ${downloadLinks.length} files to download.`);

        // Download all files
        const downloadPromises = downloadLinks.map(async (downloadLink, index) => {
            console.log(`Worker ${process.pid} - Downloading file ${index + 1} from: ${downloadLink}`);

            try {
                const response = await axios({
                    url: downloadLink,
                    method: 'GET',
                    responseType: 'stream',
                    timeout: 30000, // 30 segundos timeout
                });

                let originalFileName = `downloaded_file_${index + 1}.pdf`;
                const contentDisposition = response.headers['content-disposition'];
                if (contentDisposition) {
                    const fileNameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                    if (fileNameMatch) {
                        originalFileName = fileNameMatch[1];
                    }
                }

                const filePath = path.join(tempDir, originalFileName);
                const writer = fs.createWriteStream(filePath);

                return new Promise((resolve, reject) => {
                    response.data.pipe(writer);
                    writer.on('finish', () => {
                        console.log(`Worker ${process.pid} - File downloaded successfully: ${originalFileName}`);
                        resolve({
                            name: originalFileName,
                            path: filePath,
                        });
                    });
                    writer.on('error', reject);
                });
            } catch (error) {
                console.error(`Error downloading file ${index + 1}:`, error.message);
                return null;
            }
        });

        // Aguarda todos os downloads terminarem
        const results = await Promise.allSettled(downloadPromises);
        
        // Filtra apenas os downloads bem-sucedidos
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                downloadedFiles.push(result.value);
            }
        });

        // Prepara resposta com arquivos em base64
        const response = {
            message: `Successfully downloaded ${downloadedFiles.length} files.`,
            files: downloadedFiles.map(file => ({
                name: file.name,
                content: fs.readFileSync(file.path, { encoding: 'base64' }),
            })),
        };

        res.json(response);

    } catch (error) {
        console.error(`Worker ${process.pid} - Error downloading files:`, error);
        res.status(500).json({
            message: 'Error downloading files',
            error: error.message,
        });
    } 
};