   const express = require('express');

   const app = express();
   app.use(express.json());

   app.get('/', (req, res) => {
     res.json({ api: 'Gerenciamento de Pedidos', status: 'online' });
   });

   module.exports = app;