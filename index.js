require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const url = require('url');
const app = express();
const minio = require('minio');
const PORT = process.env.PORT;

//static files
app.use(express.static('views'));

app.use(morgan('combined'));

// set the view engine to ejs
app.set('view engine', 'ejs');

const minioClient = new minio.Client({
    endPoint: process.env.minio_endpoint,
    accessKey: process.env.minio_accessKey,
    secretKey: process.env.minio_secretKey,
});

app.get('/', (req, res) => {
    minioClient.listBuckets(async (err, buckets) => {
        if (err) {
            res.status(400).json({
                message: 'Something went wrong'
            });
        } else {
            let mapBucket = [];
            await Promise.all(
                buckets.map(async (item) => {
                    let policy = await minioClient.getBucketPolicy(item['name']);
                    policy = JSON.parse(policy);
                    if(policy.Statement.length > 0) {
                        mapBucket.push(item);
                    }
                }
            ));
            res.render('pages/folders', {
                data: mapBucket
            });
        }
    });
});

app.get('/list', async (req, res) => {
    let { bucket } = req.query;
    let data = [];
    let object = minioClient.listObjects(bucket, '', true, {});

    object.on('data', obj => {
        data.push(obj);
    });

    object.on('end', (obj) => {
        let result = [];
        data.map(item => {
            let url = `${process.env.minio_url}${bucket}/${item.name}`
            item.url = url;
            result.push(item);
        });
        
        res.render('pages/files', {
            data: result
        });
    });

    object.on('error', err => {
        res.status(400).json({
            message: 'Something went wrong'
        });
    });
});

app.listen(PORT,
    () => console.log(`Server listening on port: ${PORT}`)
);