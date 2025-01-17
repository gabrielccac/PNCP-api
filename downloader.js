const axios = require('axios');
const fs = require('fs');
const path = require('path');

exports.downloadFiles = async (req, res) => {
    try {
        const { downloadLinks } = req.body;

        if (!downloadLinks || !Array.isArray(downloadLinks) || downloadLinks.length === 0) {
            return res.status(400).json({
                message: 'Download links array is required in the request body.',
            });
        }

        console.log(`Found ${downloadLinks.length} files to download.`);

        // Download all files
        const downloadedFiles = [];
        for (const [index, downloadLink] of downloadLinks.entries()) {
            console.log(`Downloading file ${index + 1} from: ${downloadLink}`);

            const response = await axios({
                url: downloadLink,
                method: 'GET',
                responseType: 'stream',
            });

            let originalFileName = `downloaded_file_${index + 1}.pdf`;
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
                if (fileNameMatch) {
                    originalFileName = fileNameMatch[1];
                }
            }

            const filePath = path.join(__dirname, originalFileName);
            const writer = fs.createWriteStream(filePath);

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`File downloaded successfully: ${originalFileName}`);
            downloadedFiles.push({
                name: originalFileName,
                path: filePath,
            });
        }

        res.json({
            message: `Successfully downloaded ${downloadedFiles.length} files.`,
            files: downloadedFiles.map(file => ({
                name: file.name,
                content: fs.readFileSync(file.path, { encoding: 'base64' }),
            })),
        });

    } catch (error) {
        console.error('Error downloading files:', error);
        res.status(500).json({
            message: 'Error downloading files',
            error: error.message,
        });
    }
};