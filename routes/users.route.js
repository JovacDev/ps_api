// Cargamos el modulo express para poder usar su metodo Router
const express = require("express");
// Cargamos el modulo bcrypt que es el que se encargara de encriptar y desencriptar la contraseña
const bcrypt = require("bcrypt");
// Cargamos el modulo jwt para poder crear un token y tener sus funcionalidades
const jwt = require("jsonwebtoken");
// Cargamos el modulo body-parser para poder parsear JSON
const bodyParser = require("body-parser");
// Cargamos el modulo nodemailer que se encarga de enviar y recibir correos
const nodemailer = require("nodemailer");
// Cargamos modulo dotenv, necesario para poder llamar a las variables del archivo .env
const config = require("dotenv").config();
// Cargamos el modulo de google apis para llamar a las Apis de Google
const { google } = require("googleapis");

// Llamamos al metodo Router de express para poder cargar las rutas y tambien usar los metodos Get, Post, Update, Delete
const router = express.Router();

// IMPORTS DE EXPORTS //
// Importamos metodos de otros archivos de nuestro programa que hemos exportado con antelacion.
const functionProtectedRoutes = require("./index.route");

// ESQUEMAS //
// Importamos los esquemas del usuario para la base de datos y poder mapearlos
const User = require("../schemas/User");

// VARIABLES //
// Es la longitud que tendra el encriptado a la hora de encriptar la contraseña
var BCRYPT_SALT_ROUNDS = 12;

const protectedRoutes = express.Router();

const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(
  process.env.IDCLIENT, // ClientID
  process.env.SECRETCLIENT, // Client Secret
  "https://developers.google.com/oauthplayground" // Redirect URL
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESHTOKEN,
});
const accessToken = oauth2Client.getAccessToken();
/*
 * Aquí estamos configurando los detalles de nuestro servidor SMTP.
 * TMP es un servidor de correo que se encarga de enviar y recibir correos electrónicos.
 */
var smtpTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL,
    clientId: process.env.IDCLIENT,
    clientSecret: process.env.SECRETCLIENT,
    refreshToken: process.env.REFRESHTOKEN,
    accessToken: accessToken,
  },
});
var rand, mailOptions, host, link;

// METODOS //

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
// Metodo que busca todos los usuarios
router.get("/allUsers", protectedRoutes, async (req, res) => {
  User.find().then((result) => {
    res.send(result);
  });
});

/*
 * Metodo que crea un nuevo usuario usando un schema de mongoose de usuario y encripta la contraseña recibida.
 */
router.post("/newUser", async (req, res) => {
  password = req.body.password;
  // Encripta la contraseña con un nivel de seguridad de 12
  bcrypt
    .hash(password, BCRYPT_SALT_ROUNDS)
    .then(function (hashedPassword) {
      password = hashedPassword;
    })
    .then(function () {
      const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: password,
        is_deleted: false,
        verify_email: false,
      });

      user
        .save()
        .then((result) => {
          email = req.body.email; // Guardamos el email de body
          host = req.get("host"); // Vemos la url que tenemos actualmente
          link = "https://" + req.get("host") + "/user/verify?email=" + email; // Link que ira en el href del html del correo
          mailOptions = {
            to: email,
            subject: "Verifica tu correo electrónico",
            html:
              "<h1>Parking Slot</h1><h3><br>Hola,<br> Por favor haz clic para verificar tu correo electrónico<br><a href=" +
              link +
              ">Clic aqui para verificar</a></h3>",
          };
          console.log(mailOptions);
          smtpTransport.sendMail(mailOptions, function (error, response) {
            if (error) {
              console.log(error);
              res.end("error");
            } else {
              console.log("Message sent: " + response.message);
              //res.end("sent");
            }
          });
          return res.json({ mensaje: "Usuario creado correctamente" });
        })
        .catch((err) => {
          return res.json({
            mensaje: "No se a podido crear el usuario correctamente",
          });
        });
    })
    .catch(function (error) {
      console.log("Error in Bcrypt: ");
      console.log(error);
      next();
    });
});

router.get("/sendEmailVerify", async (req, res) => {
  email = req.query.email; // Guardamos el email de body
  host = req.get("host"); // Vemos la url que tenemos actualmente
  link = "https://" + req.get("host") + "/user/verify?email=" + email; // Link que ira en el href del html del correo
  mailOptions = {
    to: email,
    subject: "Verifica tu correo electrónico",
    html:
      "<h1>Parking Slot</h1><h3><br>Hola,<br> Por favor haz clic para verificar tu correo electrónico<br><a href=" +
      link +
      ">Clic aqui para verificar</a></h3>",
  };
  console.log(mailOptions);
  smtpTransport.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log(error);
      res.json({
        mensaje: "El correo no se envio correctamente"
      })
      //res.end("error");
    } else {
      console.log("Message sent: " + response.message);
      res.json({
        mensaje: "Correo enviado correctamente"
      })
      //res.end("sent");
    }
  });
});

router.get("/rememberAccount", async (req, res) => {
  User.findOneAndUpdate(
    {email: req.query.email},
    {$set:{is_deleted: false}},
    {new: true},
    )
    .then((result) => {
      res.end(
        "<h1>La cuenta con el correo <u>" +
          mailOptions.to +
          "</u> se ha activado correctamente"
      );
    })
    .catch((error) => {
      res.end(
        "<h1>No se a recuperado la cuenta correctamente."
      )
    });
});

router.get("/verify", async (req, res) => {
  User.findOneAndUpdate(
    {email: req.query.email},
    {$set:{verify_email: true}},
    {new: true}
  )
    .then((result) => {
      res.end(
        "<h1>El correo electronico <u>" +
          mailOptions.to +
          "</u> se ha verificado correctamente"
      );
    })
    .catch((error) => {
      console.log(error);
      res.end(
        "<h1> No se a podido verificar tu correo correctamente"
      )
    });
});

router.get("/sendEmailPassword", async (req, res) => {
  email = req.query.email; // Guardamos el email de body
  host = req.get("host"); // Vemos la url que tenemos actualmente
  link = "https://" + req.get("host") + "/user/rememberPassword?email=" + email; // Link que ira en el href del html del correo
  mailOptions = {
    to: email,
    subject: "Recuperar contraseña",
    html:
      "<h1>Parking Slot</h1><h3><br>Hola,<br> Por favor haz clic para recuperar tu contraseña<br><a href=" +
      link +
      ">Clic aqui para recuperar</a></h3>",
  };
  console.log(mailOptions);
  smtpTransport.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log(error);
      res.json({
        mensaje: "El correo no se envio correctamente"
      })
      //res.end("error");
    } else {
      console.log("Message sent: " + response.message);
      res.json({
        mensaje: "Se te a enviado un correo electronico, consulta tu bandeja"
      })
      //res.end("sent");
    }
  });
});

router.get("/rememberPassword", async (req, res) => {
  let password = Math.floor(Math.random() * 9999999) + 10000;
  password = password.toString();
  let emailPassword = password;
  bcrypt
      .hash(password, BCRYPT_SALT_ROUNDS)
      .then(function (hashedPassword) {
        password = hashedPassword;
      })
      .then(function () {
        User.findOneAndUpdate(
          {email: req.query.email},
          {$set:{password: password}},
          {new: true},
          )
          .then((result) => {
            res.end(
              "<h1>Tu nueva contraseña es <u>" +
                emailPassword +
                "</u> se ha verificado correctamente<br> No olvides cambiar tu contraseña una vez inicies sesion, en el apartado perfil."
            );
          })
          .catch((error) => {
            res.end(
              "<h1>La contraseña no se recupero correctamente"
            )
          });
      });
});

router.get("/sendEmailAccount", async (req, res) => {
  email = req.query.email; // Guardamos el email de body
  host = req.get("host"); // Vemos la url que tenemos actualmente
  link = "https://" + req.get("host") + "/user/rememberAccount?email=" + email; // Link que ira en el href del html del correo
  mailOptions = {
    to: email,
    subject: "Recuperar cuenta",
    html:
      "<h1>Parking Slot</h1><h3><br>Hola,<br> Por favor haz clic para recuperar tu cuenta<br><a href=" +
      link +
      ">Clic aqui para recuperar</a></h3>",
  };
  console.log(mailOptions);
  smtpTransport.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log(error);
      res.json({
        mensaje: "El correo no se envio correctamente"
      })
      //res.end("error");
    } else {
      console.log("Message sent: " + response.message);
      res.json({
        mensaje: "Se te a enviado un correo electronico, consulta tu bandeja"
      })
      //res.end("sent");
    }
  });
});

router.get("/rememberAccount", async (req, res) => {
  User.findOneAndUpdate(
    {email: req.query.email},
    {$set:{is_deleted: false}},
    {new: true},
    )
    .then((result) => {
      res.end(
        "<h1>La cuenta con el correo <u>" +
          mailOptions.to +
          "</u> se ha activado correctamente"
      );
    })
    .catch((error) => {
      res.end(
        "<h1>No se a recuperado la cuenta correctamente."
      )
    });
});

/*
 * Metodo para buscar un usuario en la base de datos y mandar lo que nosotros queramos
 */
router.get("/getUser", protectedRoutes, async (req, res) => {
  User.findOne({ username: req.query.username }).then((result) => {
    //console.log(result);
    res.json({
      username: result.username,
      email: result.email,
    });
  });
});

router.get("/getUserEmail", async (req, res) => {
  console.log(req.query.email);
  var user = await User.findOne({ email: req.query.email }).exec();
  if (!user) {
    return res.json({
      exists: false,
      mensaje: "El correo no existe en nuestro sistema",
    });
  } else {
    return res.json({
      exists: true,
      mensaje: "El correo existe en nuestro sistema",
    });
  }
});

/*
 * Login donde busca un usuario por correo electronico y cuando lo encuentra envia al frontend
 * Un mensaje de que a sido correcto, el correo electronico y el token generado
 */

router.post("/login", async (req, res) => {
  username = req.body.username;
  password = req.body.password;
  try {
    var user = await User.findOne({ username: username }).exec();
    if (!user) {
      return res.json({
        mensaje: "Usuario o contraseña incorrectos",
      });
    }
    if (!bcrypt.compareSync(password, user.password)) {
      return res.json({
        mensaje: "Usuario o contraseña incorrectos",
      });
    }
    if (user.is_deleted == true) {
      return res.json({
        mensaje: "Este usuario fue eliminado",
      });
    }
    if (user.verify_email == false) {
      return res.json({
        mensaje: "Por favor, verifique el correo electronico.",
      });
    }
    const payload = {
      check: true,
    };
    // Aqui creamos el token con el payload y la clave que hemos puesto nosotros.
    const token = jwt.sign(payload, process.env.KEY);
    userLogged = username;
    res.json({
      mensaje: "Autenticación correcta",
      username: username,
      token: token,
    });
  } catch (error) {
    res.status(500).send("error: " + error);
  }
});

/*
 * Metodo para hacer un update del user, aqui como vamos a recibir distintos parametros he hecho un if.
 * Este if lo que hace es que si el parametro no viene porque el usuario a decidido no cambiar la contraseña
 * si no solo cambiar el correo o el nombre de usuario lo controlara y cambiara solo lo que tenga que cambiar.
 */
router.post("/updateUser", protectedRoutes, async (req, res) => {
  if (req.body.password) {
    bcrypt
      .hash(req.body.password, BCRYPT_SALT_ROUNDS)
      .then(function (hashedPassword) {
        req.body.password = hashedPassword;
      })
      .then(function () {
        User.findOneAndUpdate(
          { username: req.body.oldUsername },
          { $set: req.body },
          { new: true }
        ).then((result) => {
          res.send(result);
        });
      });
  } else {
    User.findOneAndUpdate(
      { username: req.body.oldUsername },
      { $set: req.body },
      { new: true }
    ).then((result) => {
      res.send(result);
    });
  }
});

router.post("/deleteUser", protectedRoutes, async (req, res) => {
  User.findOneAndUpdate(
    { username: req.body.username },
    { is_deleted: req.body.is_deleted },
    { new: true }
  )
    .then((result) => {
      res.json({
        mensaje: "Este usuario fue eliminado correctamente",
      });
    })
    .catch(function (error) {
      res.json({
        mensaje: "No se a podido eliminar correctamente el usuario",
      });
    });
});

module.exports = router;
