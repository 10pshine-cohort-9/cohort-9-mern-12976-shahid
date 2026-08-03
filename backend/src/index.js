import express from "express";
import dotenv from "dotenv";

const PORT = process.env.PORT || 3000;
dotenv.config();

const app = express()

app.use(express.json())
app.use((req, res) => {
    res.send("Hello World, this is Shahid Ali") 
})


app.listen(PORT, () => { 
    console.log(`Server is running on http://localhost:${PORT}`)
})