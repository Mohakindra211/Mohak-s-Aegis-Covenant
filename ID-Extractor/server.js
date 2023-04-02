const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const PDFDocument = require("pdf-lib").PDFDocument;
const fs = require("fs");

const app = express();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post("/extract", upload.single("image"), async (req, res) => {
  try {
    const imagePath = `./${req.file.path}`;

    let extractedText;

    if (req.file.mimetype === "application/pdf") {
      extractedText = await extractTextFromPDF(imagePath);
    } else {
      extractedText = await extractTextFromImage(imagePath);
    }

    fs.unlinkSync(imagePath);

    res.json({ extractedText });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
async function extractTextFromPDF(path) {
  const pdfDoc = await PDFDocument.load(fs.readFileSync(path));

  const pages = pdfDoc.getPages();
  const pageTexts = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageText = await page.getText();
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n");
}

async function extractTextFromImage(path) {
  const image = sharp(path);

  const buffer = await image.resize(500).normalise().grayscale().toBuffer();

  const { data } = await Tesseract.recognize(buffer, {
    lang: "eng",
    tessedit_char_whitelist:
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz./:-()",
  });

  return data.trim();
}
