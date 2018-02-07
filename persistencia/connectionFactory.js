var mysql = require('mysql');

function createDBConnection(){
    return mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'payfast_node'
    });
}

module.exports = function(){
    return createDBConnection;
}