const PAGAMENTO_CRIADO = "CRIADO";
const PAGAMENTO_CONFIRMADO = "CONFIRMADO";
const PAGAMENTO_CANCELADO = "CANCELADO";

var logger = require('../servicos/Logger.js')

module.exports = function(app){
    app.get('/pagamentos', function(req, res){
        console.log('Requisiçções de pagamentos.');
        res.send('OK.');
    });

    app.get('/pagamentos/pagamento/:id', function(req, res){
        var id = req.params.id;
        console.log('Consultando pagamento: '+ id);
        logger.info('Consultando pagamento: '+ id);

        //Recupero um pagamento do 'cache'.
        var memcachedClient = new app.servicos.MemcachedClient();
        memcachedClient.get('pagamento-' + id, function(erro1, retorno){
            if (erro1 || !retorno){
                console.log('MISS - Chave não encontrada.');
                //Conexão com o banco de dados.
                var connection = app.persistencia.connectionFactory();
                //Criação de uma instância do 'pagamentoDAO'.
                var pagamentoDAO = new app.persistencia.PagamentoDAO(connection);

                pagamentoDAO.buscaPorId(id, function(erro2, resultado){
                    if(erro2){
                        console.log('Erro ao consultar no banco: \n' + erro2);
                        res.status(500).send(erro2);
                        return;
                    } else {
                        console.log('Pagamento encontrado: \n' + JSON.stringify(resultado));
                        res.json(resultado);
                    }
                });
            } else {
                console.log('HIT - Valor: ' + JSON.stringify(retorno));
                res.json(retorno);
            }
        });

        
    });

    app.put('/pagamentos/pagamento/:id', function(req, res){
        var id = req.params.id;
        var pagamento = {};

        pagamento.id = id;
        pagamento.status = PAGAMENTO_CONFIRMADO;

        //Conexão com o banco de dados.
        var connection = app.persistencia.connectionFactory();
        //Criação de uma instância do 'pagamentoDAO'.
        var pagamentoDAO = new app.persistencia.PagamentoDAO(connection);

        pagamentoDAO.atualiza(pagamento, function(erro){
            if(erro){
                console.log('Erro ao atualizar o banco.');
                res.status(500).send(erro);
                return
            }
            console.log('Pagamento confirmado.');
            res.status(202).send(pagamento);
        });

    });

    app.delete('/pagamentos/pagamento/:id', function(req, res){
        var id = req.params.id;
        var pagamento = {};

        pagamento.id = id;
        pagamento.status = PAGAMENTO_CANCELADO;

        //Conexão com o banco de dados.
        var connection = app.persistencia.connectionFactory();
        //Criação de uma instância do 'pagamentoDAO'.
        var pagamentoDAO = new app.persistencia.PagamentoDAO(connection);

        pagamentoDAO.atualiza(pagamento, function(erro){
            if(erro){
                console.log('Erro ao atualizar o banco.');
                res.status(500).send(erro);
                return
            }
            console.log('Pagamento cancelado.');
            res.status(204).send(pagamento);
        });
    });

    app.post('/pagamentos/pagamento', function(req, res){

        var body = req.body;
        var pagamento = body["pagamento"];
        console.log('Processando uma requisição de pagamento.');
        console.log(pagamento);

        req.assert("pagamento.forma_de_pagamento", "Forma de pagamento é obrigatória.").notEmpty();
        req.assert("pagamento.valor", "Valor é obrigatório e deve ser um decimal.").notEmpty().isFloat();
        req.assert("pagamento.moeda", "Moeda é obrigatória e deve ter 3 caracteres.").notEmpty().len(3, 3);

        //Repupera os erros de validação e apresenta os erros encontrados.
        var errors = req.validationErrors();
        if(errors){
            console.log('Erros de validação encontrados.');
            console.log(req.body);
            res.status(400).send(errors);
            return;
        }

        pagamento.status = PAGAMENTO_CRIADO;
        pagamento.data = new Date;

        //Conexão com o banco de dados.
        var connection = app.persistencia.connectionFactory();
        //Criação de uma instância do 'pagamentoDAO'.
        var pagamentoDAO = new app.persistencia.PagamentoDAO(connection);

        pagamentoDAO.salva(pagamento, function(erro, resultado){
            if(erro){
                console.log('Erro ao inserir no banco.');
                res.status(500).send(erro);
            } else {
                console.log('Pagamento criado.');
                pagamento.id = resultado.insertId;

                //Armazena um pagamento no 'cache'.
                var memcachedClient = new app.servicos.MemcachedClient();
                memcachedClient.set('pagamento-' + pagamento.id, pagamento, 60000, function(err){
                    console.log('Nova chave adicionada ao cache.');
                });
                
                

                //Consumir serviço REST.
                if(pagamento.forma_de_pagamento == 'cartao'){
                    var cartao = body["cartao"];
                    console.log(cartao);

                    var clienteCartoes = new app.servicos.CartoesClient();
                    clienteCartoes.autoriza(cartao, function(exception, request, response, retorno){
                        if(exception){
                            console.log(exception);
                            res.status(400).send(exception);
                            return;
                        }
                        console.log(retorno);

                        res.location('/pagamentos/pagamento/' + pagamento.id);

                        var response = {
                            dados_do_pagamento: pagamento,
                            cartao: retorno,
                            links: [
                                {
                                    href: "http://localhost:3000/pagamentos/pagamento/" + pagamento.id,
                                    rel:"confirmar",
                                    method: "PUT"
                                },
                                {
                                    href: "http://localhost:3000/pagamentos/pagamento/" + pagamento.id,
                                    rel:"cancelar",
                                    method: "DELETE"
                                }
                            ]
                        }

                        res.status(201).json(response);
                        return;
                    });

                } else {
                    res.location('/pagamentos/pagamento/' + pagamento.id);

                    var response = {
                        dados_do_pagamento: pagamento,
                        links: [
                            {
                                href: "http://localhost:3000/pagamentos/pagamento/" + pagamento.id,
                                rel:"confirmar",
                                method: "PUT"
                            },
                            {
                                href: "http://localhost:3000/pagamentos/pagamento/" + pagamento.id,
                                rel:"cancelar",
                                method: "DELETE"
                            }
                        ]
                    }

                    res.status(201).json(response);
                }
            }
        });
    });
}
