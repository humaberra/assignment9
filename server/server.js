import express from 'express';

const app = express();

// Port comes from the environment, falls back to 3000
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, (error) => {
  if (error) {
    throw error;
  }
  console.log(`Server listening on http://localhost:${PORT}`);
});