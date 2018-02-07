module.exports = function(app){

    app.post('/correios/calculo-prazo', function(req, res){
        var dadosDaEntrega = req.body;

        var correiosSOAPClient = new app.servicos.CorreiosSOAPClient();
        correiosSOAPClient.calculaPrazo(dadosDaEntrega, function(erro, resultado){
            if(erro){
                console.log('Erro ao calcular prazo de entrega.');
                res.status(500).send(erro);
                return;
            } else {
                console.log('Prazo calculado');
                res.json(resultado);
            }
        });
    });
} 