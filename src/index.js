import dotenv from 'dotenv'
import express from 'express'
import connectDB from './db/index.js'
const app = express();

dotenv.config({
    path: './env'
})
const PORT = process.env.PORT | 8000;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`App is listening on ${PORT}`);
        
    })
}).catch((error) => {
    console.log('Mongo Db Connection Failed', error);
})