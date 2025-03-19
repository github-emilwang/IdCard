const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// 创建 Express 应用
const app = express();
// 设置文件上传的临时存储目录
const upload = multer({ dest: 'uploads/' });
// 静态文件服务，用于提供前端页面
app.use(express.static(path.join(__dirname, 'public')));

// 处理生成 PDF 的 POST 请求
app.post('/generate-pdf', upload.fields([{ name: 'frontPhoto', maxCount: 1 }, { name: 'backPhoto', maxCount: 1 }]), async (req, res) => {
    try {
        // 获取上传的身份证正反面照片的临时文件路径
        const frontPhotoPath = req.files['frontPhoto'][0].path;
        const backPhotoPath = req.files['backPhoto'][0].path;

        // 身份证尺寸（单位：点，72 点 = 1 英寸）
        const idCardWidth = Math.round(85.60 / 25.4 * 72);
        const idCardHeight = Math.round(54 / 25.4 * 72);

        // A4 纸尺寸（单位：点）
        const a4Width = 595.28;
        const a4Height = 841.89;

        // 调整照片大小并去除黑边，同时调整方向
        const resizeAndOrientImage = async (imagePath) => {
            const metadata = await sharp(imagePath).metadata();
            let image = sharp(imagePath);
            if (metadata.height > metadata.width) {
                image = image.rotate(90);
            }
            return image
              .resize({ width: idCardWidth, height: idCardHeight, fit: 'cover' })
              .toBuffer();
        };

        const resizedFrontPhoto = await resizeAndOrientImage(frontPhotoPath);
        const resizedBackPhoto = await resizeAndOrientImage(backPhotoPath);

        // 创建 PDF 文档
        const doc = new PDFDocument({ size: [a4Width, a4Height] });
        const chunks = [];

        // 监听 PDF 文档的数据事件，将数据块添加到数组中
        doc.on('data', (chunk) => chunks.push(chunk));
        // 监听 PDF 文档的结束事件，将所有数据块合并成一个 Buffer 并发送给客户端
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=id_card.pdf');
            res.send(pdfBuffer);

            // 删除临时上传的照片文件
            fs.unlink(frontPhotoPath, (err) => {
                if (err) console.error('删除正面照片临时文件时出错:', err);
            });
            fs.unlink(backPhotoPath, (err) => {
                if (err) console.error('删除反面照片临时文件时出错:', err);
            });
        });

        // 计算身份证照片在 A4 纸上的居中位置
        const x = (a4Width - idCardWidth) / 2;
        const frontY = (a4Height / 2 - idCardHeight) / 2;
        const backY = a4Height / 2 + (a4Height / 2 - idCardHeight) / 2;

        // 将调整大小后的照片添加到 PDF 文档中
        doc.image(resizedFrontPhoto, x, frontY, { width: idCardWidth, height: idCardHeight });
        doc.image(resizedBackPhoto, x, backY, { width: idCardWidth, height: idCardHeight });

        // 结束 PDF 文档的编写
        doc.end();
    } catch (error) {
        console.error('生成 PDF 时出错:', error);
        res.status(500).send(`生成 PDF 时出错：${error.message}`);
    }
});

// 启动服务器，监听 3000 端口
const port = 3000;
app.listen(port, () => {
    console.log(`服务器正在运行，访问地址：http://localhost:${port}`);
});
