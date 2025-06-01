const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const  redis = require('redis');
const app = express();
const fs = require('fs');
const { Parser } = require('json2csv');
const path = require('path');
const pdf = require('pdfkit');
const PDFDocument = require('pdfkit');
const { time } = require('console');
const stream = require('stream');
const bodyParser = require('body-parser')
const getStream = require('get-stream');
const moment = require('moment')
const dotenv = require('dotenv');
dotenv.config();

const auth = require('./routes/auth/auth');
const authenticate = require('./middleware/authenticate')


const cors = require('cors');
app.use(cors(
    {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST', 'DELETE'], // Allow specific HTTP methods
        allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
    }
));
app.use(bodyParser.json({extended: true}))

// MongoDB setup
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    authSource: 'admin',
});

console.log(process.env.REDIS_URL)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
})();


const FormDataSchema = new mongoose.Schema({
    textData: Object,
    images: Object,
    timestamp: { type: Date, default: Date.now },
    _id: { type: String },
    pdfUrl: String,
});

const FormData = mongoose.model('FormData', FormDataSchema);


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// MinIO (S3-compatible) setup
const s3 = new AWS.S3({
    accessKeyId: process.env.S3_BUCKET_ACCESS_KEY,
    secretAccessKey: process.env.S3_BUCKET_SECRET_KEY,
    endpoint: process.env.S3_BUCKET_ENDPOINT,
    s3ForcePathStyle: true, // needed for MinIO
    signatureVersion: 'v4',
});

const upload = multer({ storage: multer.memoryStorage() }); // in-memory storage


const downloadImage = async (key) => {
    try {
        const data = await s3.getObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        }).promise();
        return data.Body; // The image will be in buffer format
    } catch (err) {
        console.error('Error downloading image from MinIO:', err);
        throw new Error('Error downloading image');
    }
};


const generatePDF = async (formData, res) => {
    try {
        const { textData = {}, images = {} } = formData;

        const doc = new PDFDocument({ margin: 50 });
        const bufferChunks = [];
        const bufferStream = new stream.PassThrough();

        // Use Helvetica or any registered fallback font
        doc.font('Helvetica');

        doc.pipe(bufferStream);
        bufferStream.on('data', chunk => bufferChunks.push(chunk));

        const keysWithImages = new Set(Object.keys(images));
        const textOnly = Object.entries(textData).filter(([key]) => !keysWithImages.has(key));
        const withImages = Object.entries(textData).filter(([key]) => keysWithImages.has(key));

        // ---------- Section 1: Text-only fields ----------
        if (textOnly.length) {
            doc.fontSize(16).text('Text Information', { underline: true });
            doc.moveDown();

            textOnly.forEach(([key, value]) => {
                const cleanValue = typeof value === 'string' ? value.replace(/[^\x00-\x7F]/g, '') : value;
                doc.fontSize(12).text(`${key}: ${cleanValue}`);
                doc.moveDown(0.5);
            });

            // Separation line
            doc.moveDown().lineWidth(1).strokeColor('#AAAAAA')
                .moveTo(doc.page.margins.left, doc.y)
                .lineTo(doc.page.width - doc.page.margins.right, doc.y)
                .stroke();
            doc.moveDown();
        }

        // ---------- Section 2: Grouped text+image ----------
        if (withImages.length) {
            doc.fontSize(16).text('Image Sections', { underline: true });
            doc.moveDown();

            for (const [key, value] of withImages) {
                const cleanValue = typeof value === 'string' ? value.replace(/[^\x00-\x7F]/g, '') : value;

                doc.fontSize(13).fillColor('black').text(`${key}`, { bold: true });
                doc.moveDown(0.5);
                doc.fontSize(12).fillColor('#333333').text(`Value: ${cleanValue}`);
                doc.moveDown();

                try {
                    const imageKey = images[key].split('/').pop();
                    const imageBuffer = await downloadImage(imageKey);
                    const imageFitHeight = 300;

                    // 🔥 Page break logic before image
                    const availableSpace = doc.page.height - doc.y - doc.page.margins.bottom;
                    if (availableSpace < imageFitHeight) {
                        doc.addPage();
                    }

                    if (imageBuffer && Buffer.isBuffer(imageBuffer)) {
                        doc.image(imageBuffer, { fit: [250, imageFitHeight], align: 'center' });
                    } else {
                        doc.fontSize(12).fillColor('red').text('Invalid image data');
                    }
                } catch (err) {
                    console.error(`Error loading image for key: ${key}`, err);
                    doc.fontSize(12).fillColor('red').text('Image could not be loaded');
                }

                // Section separator
                doc.moveDown().lineWidth(0.5).strokeColor('#DDDDDD')
                    .moveTo(doc.page.margins.left, doc.y)
                    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
                    .stroke();
                doc.moveDown();
            }
        }

        // Finalize PDF
        await new Promise((resolve, reject) => {
            doc.on('end', resolve);
            doc.on('error', reject);
            doc.end();
        });

        const pdfBuffer = Buffer.concat(bufferChunks);
        const pdfKey = `pdfs/${uuidv4()}.pdf`;

        const uploadResult = await s3.upload({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: pdfKey,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
        }).promise();

        await FormData.updateOne(
            { _id: formData._id },
            { $set: { pdfUrl: uploadResult.Location } }
        );

        console.log('PDF uploaded to S3:', uploadResult.Location);
        res.status(200).json({
            message: 'PDF generated and stored successfully',
            pdfUrl: uploadResult.Location,
        });

    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).json({ error: 'Something went wrong during PDF generation' });
    }
};


// Start form - just generate an ID and return it
app.post('/start-form', async (req, res) => {
  const formId = uuidv4();
  // No DB save here - just send ID back
  return res.status(200).json({ message: 'Form session started', formId });
});

// Submit form data/images - store in Redis
app.post('/submit/:formId', upload.any(), async (req, res) => {
  const { formId } = req.params;

  try {
    // Get existing form data from Redis
    const formDataRaw = await redisClient.get(formId);
    const formData = formDataRaw ? JSON.parse(formDataRaw) : { textData: {}, images: {} };

    // Handle image uploads to S3
    const imageUrls = { ...formData.images };
    for (const file of req.files) {
      const uniqueFileName = `${uuidv4()}-${file.originalname}`;
      const uploadResult = await s3.upload({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      }).promise();
      imageUrls[file.fieldname] = uploadResult.Location;
    }

    // Merge existing text data with new submitted data
    const updatedText = { ...formData.textData, ...req.body };

    // Save updated form data to Redis with TTL
    const newFormData = { textData: updatedText, images: imageUrls };
    await redisClient.set(formId, JSON.stringify(newFormData), {
      EX: 86400, // TTL: 24 hours in seconds
    });

    res.status(200).json({ message: 'Page data saved successfully' });
  } catch (err) {
    console.error('Error submitting form page:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


// Finalize - fetch data from Redis, save to MongoDB, generate PDF, then delete Redis key
app.post('/submit/:formId/finalize', async (req, res) => {
  const { formId } = req.params;

  try {
    // Get form data from Redis
    const formDataRaw = await redisClient.get(formId);
    if (!formDataRaw) return res.status(404).json({ error: 'Form not found in session' });

    const formDataObj = JSON.parse(formDataRaw);

    // Save to MongoDB only at finalize
    const formData = new FormData({
      _id: formId,
      textData: formDataObj.textData,
      images: formDataObj.images,
    });
    await formData.save();

    // Generate PDF with saved data
    await generatePDF(formData, res);

    // Remove data from Redis after finalizing
    await redisClient.del(formId);
  } catch (err) {
    console.error('Finalize Error:', err);
    res.status(500).json({ error: 'Error generating final PDF' });
  }
});


app.get('/data', authenticate, async (req, res) => {
    try {
        // Get startDate and endDate from query parameters, default to today's date
       
        const { startDate, endDate } = req.query;

        // If no startDate or endDate is provided, set them to today
        const start = startDate ? moment(startDate).startOf('day').toDate() : moment().startOf('day').toDate();
        const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('day').toDate();

        // Retrieve all form data that falls within the date range using `timestamp`
        const allData = await FormData.find({
            timestamp: { $gte: start, $lte: end }, // Use `timestamp` instead of `createdAt`
        });

        if (allData.length === 0) {
            return res.status(200).json({
                message: 'No data found for the selected date range',
                data: [],
            });
        }

        res.status(200).json({
            message: 'Form data retrieved successfully',
            data: allData,
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


const isImageURL = (value) => {
    return (typeof value === 'string' && (value.endsWith('.jpg') || value.endsWith('.jpeg') || value.endsWith('.png') || value.endsWith('.gif') || value.endsWith('.bmp') || value.endsWith('.svg')));
};

app.get('/data/download', async (req, res) => {
    try {
        // Extract startDate and endDate from the query parameters
        const { startDate, endDate } = req.query;

        // If no startDate or endDate is provided, set them to today
        const start = startDate ? moment(startDate).startOf('day').toDate() : moment().startOf('day').toDate();
        const end = endDate ? moment(endDate).endOf('day').toDate() : moment().endOf('day').toDate();

        // Retrieve form data that falls within the date range using `timestamp`
        const allData = await FormData.find({
            timestamp: { $gte: start, $lte: end },  // Filter based on timestamp
        });

        const allTextKeys = new Set();
        const allImageKeys = new Set();

        // Extracting all text and image keys
        allData.forEach(entry => {
            if (entry.textData) {
                Object.keys(entry.textData).forEach(key => allTextKeys.add(key));
            }
            if (entry.images) {
                Object.keys(entry.images).forEach(key => allImageKeys.add(key));
            }
        });

        // Sorting keys to maintain consistency
        const sortedTextKeys = Array.from(allTextKeys);
        const sortedImageKeys = Array.from(allImageKeys);

        // Create CSV rows with both text and image data
        const rows = allData.map(entry => {
            const row = {};

            // Add text data to the row
            sortedTextKeys.forEach(key => {
                const value = entry.textData?.[key] || '';
                row[key] = value;
            });

            // Add image data to the row, combining image and text with the same key
            sortedImageKeys.forEach(key => {
                row[`image_${key}`] = entry.images?.[key] || '';
            });

            // Add PDF URL and ID
            row['pdfUrl'] = entry.pdfUrl || 'No PDF available';
            row['ID'] = entry._id.toString();

            return row;
        });

        // Fields for the CSV, including both text and image keys
        const parser = new Parser({
            fields: [...sortedTextKeys, ...sortedImageKeys.map(key => `image_${key}`), 'ID', 'pdfUrl']
        });

        // Generate CSV from the rows
        const csv = parser.parse(rows);

        // Send the CSV file in the response
        res.header('Content-Type', 'text/csv');
        res.attachment('form_data.csv');
        return res.send(csv);

    } catch (err) {
        console.error('CSV download error:', err);
        res.status(500).send('Something went wrong');
    }
});



app.delete('/delete-data', authenticate, async (req, res) => {
    try {
        // Extract list of IDs from the request body
        const { ids } = req.body;

        // Ensure that IDs are provided and are in an array
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Please provide a list of IDs' });
        }

        // Delete records matching the provided IDs
        const deletedData = await FormData.deleteMany({
            _id: { $in: ids },
        });

        // Check if any records were deleted
        if (deletedData.deletedCount === 0) {
            return res.status(404).json({ message: 'No data found with the provided IDs' });
        }

        res.status(200).json({
            message: `${deletedData.deletedCount} records deleted successfully`,
        });
    } catch (err) {
        console.error('Error deleting data:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// auth routes
app.use("/auth", auth);
app.get("/auth-check",authenticate,(req,res)=>{
    console.log('auth-check')
  return res.status(200).json({isAuthenticated:true})
})


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
