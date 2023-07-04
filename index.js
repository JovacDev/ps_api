// MODULOS //
// Cargar modulo de express
const express = require("express");
// Cargamos el modulo de mongoose, necesario para conectarte a mongoDB
const mongoose = require('mongoose');
// Cargamos modulo dotenv, necesario para poder llamar a las variables del archivo .env
const config = require("dotenv").config();
// Cargamos el modulo de body-parser para poder parsear lo que nos entra a JSON
const bodyParser = require('body-parser');
// Cargamos el modulo de los cors, para que al hacer una peticion https no nos de error de los cors en nuestra app
const cors = require('cors');

// USOS DE EXPRESS //
// Llamamos a express para poder usar sus funciones
const app = express();
// Este App.use llama a los cors para las autorizaciones, porque en peticiones HTTPS salta un error de policy cors.
app.use(cors({
    allowedHeaders: ["authorization", "Content-Type"], // you can change the headers
    exposedHeaders: ["authorization"], // you can change the headers
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false
}));
/*
* Una vez llamado al express podemos usar su metodo use() que sirve para cargar complementos en nuestra api
* Un ejemplo es cargar el bodyParser para si poder parsear todos los formularios que nos vengan de peticiones
* a JSON y poder leerlo y ejecutarlo correctamente.
*/
app.use(express.urlencoded({ extended: true}));
app.use(bodyParser.json());

// CARGAS DE ARCHIVOS DE RUTA //
// Cargamos el archivo que tendra todas las rutas, donde dependiendo de cada ruta ira a un lugar o a otro.
const routesIndex = require("./routes/index.route");

/* NOTA IMPORTANTE SOBRE HEROKU
* Cuando nosotros queremos subir la app a Heroku hay que seguir unos pasos:
* - Poner la ruta de mongoatlas con usuario y contraseña y la base de datos que vamos a acceder en variables de entorno de Heroku
* - Poner en nuestro index.js donde se conecta a mongo atlas la variable de enterno process.env.NOMBREQUEQUERAMOS que sera el mismo que esta en heroku
* - Cambiar en el package.json los scripts y poner un start que es donde Heroku cogera el comando para iniciar la app en nuestro caso node index.js como lo hacemos en local.
*/



/*
* URL para conectarte con mongo atlas, las variables estan en el fichero .env
* el fichero no se sube a github por seguridad a si que dejare un enlace para descargar el archivo .env
*/

const url = "mongodb+srv://" + process.env.ATLASUSERNAME + ":" + process.env.ATLASPASSWORD + "@parkingslotcluster-r2jyp.mongodb.net/parkingslot?retryWrites=true&w=majority";

/*
* Conexion a la base de datos 
*/
mongoose
    .connect(process.env.MONGODB_HEROKU || url , {
        // Comprueba que sea una url
        useNewUrlParser: true,
        // Comprueba el motor y el servidor
        useUnifiedTopology: true
    });

    /*
    * Metodos para comprobar si se conecta o no a la base de datos de mongoAtlas
    * Es necesario hacer el mongoose.connection si no no detecta los metodos on y once
    */
    var mongoConnect = mongoose.connection;
    // Para saber si la conexion es erronea
    mongoConnect.on('error', () => { 
        console.log('connection error:')
    });
    // Para saber si la conexion es exitosa
    mongoConnect.once('open', () => {
        console.log('Conectado correctamente');
    })

const PORT = process.env.PORT || 8080;

// Le decimos a la aplicacion que escuche en el puerto declarado anteriormente
app.listen(PORT, () => {
    console.log(`El servidor esta inicializado en el puerto ${PORT}`);
})

// Le decimos que use las rutas que se encuentran en routesIndex
app.use(routesIndex);