var fs = require('fs');

fs.readFile('imagem.jpg', function(error1, buffer){
    console.log('Arquivo lido.');

    fs.writeFile('imagem2.jpg', buffer, function(error2){
        console.log('Arquivo escrito.');
    });
});