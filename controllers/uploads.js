var fs = require('fs');

module.exports = function(app){

    app.post('/upload/imagem', function(req, res){
        console.log('Recebendo imagem.');

        //Recebendo o nome do arquivo.
        var filename = req.headers.filename;
        console.log(filename);

        //Escrevendo o arquivo.
        req.pipe(fs.createWriteStream('files/' + filename))
            .on('finish', function(){
                console.log('Arquivo salvo com sucesso.');
                res.status(201).send('Ok.');
            });
    });
}