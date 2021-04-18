const express = require('express')
const multer = require('multer')
const fs = require('fs')
const sharp = require('sharp')
const path = require('path')
const aws = require('aws-sdk')

aws.config.update({
    accessKeyId: 'AKIA5PIXTC6MFZDV35OU',
    secretAccessKey: '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'
})

const app = express()
app.use('/static', express.static(path.join(__dirname, 'static')))

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    next()
})

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpg', 'image/jpeg', 'image/png']

    if(!allowedTypes.includes(file.mimetype)) {
        const error = new Error('Wrong file type')
        error.code = 'LIMIT_FILE_TYPES'
        return cb(error, false)
    }
    cb(null, true)
}

const MAX_SIZE = 1000000

const upload = multer({
    dest: './uploads/',
    fileFilter,
    limits: {
        fileSize: MAX_SIZE
    }
})

app.post('/upload', upload.single('image'), (req, res) => {
    res.status(200).json({ file: req.file })
})

app.post('/multiple', upload.array('images'), (req, res) => {
    res.status(200).json({ files: req.files })
})

app.post('/dropzone', upload.single('image'), async (req, res) => {
    const s3 = new aws.S3()
    const now = Date.now()

    try {
        const buffer = await sharp(req.file.path)
            .resize(300, 200)
            .toBuffer()

        const s3res = await s3.upload({
            Bucket: 'mawirabucket',
            Key: `${now}-${req.file.originalname}`,
            Body: buffer,
            ACL: 'public-read'
        }).promise()

        fs.unlink(req.file.path, () => {
            res.json({ file: s3res.Location })
        })
    } catch(err) {
        res.status(422).json({ error: err })
    }
})

app.use((error, req, res, next) => {
    if(error.code == 'LIMIT_FILE_TYPES') {
        res.status(422).json({ error: 'Only images are allowed' })
        return
    }
    if(error.code == 'LIMIT_FILE_SIZE') {
        res.status(422).json({ error: `Too large. Max size is ${MAX_SIZE/1000}KB` })
        return
    }
})

app.listen(4000, () => {
    console.log('Ready when you are..')
})