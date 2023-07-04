// Cargamos el modulo express para poder usar su metodo Router
const express = require("express");
// Llamamos al metodo Router de express para poder cargar las rutas y tambien usar los metodos Get, Post, Update, Delete
const router = express.Router();
// Cargamos el modulo jwt para poder crear un token y tener sus funcionalidades
const jwt = require("jsonwebtoken");

const protectedRoutes = express.Router();


// ESQUEMAS //
// Importamos los esquemas del usuario para la base de datos y poder mapearlos
const Location = require("../schemas/Location");

/*
* Este metodo lo que hace es comprobar que el usuario que hace peticiones una vez inicido sesion tiene el token,
* si el usuario no tuvier el token no podria hacer ninguna accion en la app ya que no tendria autorizacion
*/
protectedRoutes.use((req, res, next) => {
    // Miramos donde esta el token en los distintos sitios
    var token =
      req.headers["authorization"] ||
      (req.body && req.body.access_token) ||
      (req.query && req.query.access_token) ||
      req.headers["x-access-token"] ||
      req.headers["access-token"] ||
      req.token ||
      req.body.token ||
      req.query.token;
  
    if (token) {
      // Verificamos el token con el propio token y la clave con la que se creo en su momento
      jwt.verify(token, process.env.KEY, (err, decoded) => {
        if (err) {
          return res.json({ mensaje: "Token invalido" });
        } else {
          req.decoded = decoded;
          next();
        }
      });
    } else {
      res.send({
        mensaje: "Token invalido",
      });
    }
  });


// PETICIONES //
/*
* Metodo que crea un nuevo usuario usando un schema de mongoose de usuario y encripta la contraseña recibida.
*/
router.post("/saveLocation", protectedRoutes, async (req, res) => {
    const loc = new Location({
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        size: req.body.size,
        zone: req.body.zone,
        date: req.body.date,
        occupied: false
    });

    loc.save().then((result) => {
        res.send(result);
    })
    .catch((error) => {
        console.log(error);
    })
});

router.get("/allLocations", protectedRoutes, async (req, res) => {
  Location.find().then((result) => {
    res.send(result);
  })
})

router.post("/deleteLocation", protectedRoutes, async (req, res) => {
  Location.findOneAndUpdate(
    { _id: req.body._id },
    { occupied: req.body.occupied },
    { new: true }
  )
    .then((result) => {
      res.json({
        mensaje: "Plaza ocupada correctamente"
      })
    })
    .catch(function (error) {
      res.json({
        mensaje: "No se puedo ocupar la plaza"
      })
    });
})

module.exports = router;