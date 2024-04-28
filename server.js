
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const cors = require('cors');


// Inicialización de la aplicación Express
const app = express();
const port = 3001;
app.use(cors({
    origin: 'http://localhost:3000'
}));
app.use(bodyParser.json());
app.use(express.json());

const sqlConfig = {
    user: 'sa',
    password: '*Tami123',
    database: 'RentCar',
    server: 'localhost',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: true, // Para Azure
        trustServerCertificate: true // Cambiar a false en producción
    }
};

let sqlPool;

sql.connect(sqlConfig)
    .then(pool => {
        console.log('Conectado a SQL Server');
        sqlPool = pool;
    })
    .catch(err => {
        console.error('Error de conexión a SQL Server:', err);
    });

//USUARIOS
app.post('/usuarios', async (req, res) => {
    try {
        const { Usuario, Contrasena, NombreCompleto } = req.body;
        console.log("Intentando insertar usuario:", Usuario);


        const result = await sqlPool.query`EXEC CrearUsuario @Usuario=${Usuario}, @Contrasena=${Contrasena}, @NombreCompleto=${NombreCompleto}`;

        console.log("Resultado de la inserción:", result);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Usuario agregado exitosamente' });
        } else {
            res.status(400).send({ message: 'No se pudo agregar el usuario.' });
        }
    } catch (err) {
        console.error("Error en la operación:", err);
        res.status(500).send({ message: err.message });
    }
});
app.post('/login', async (req, res) => {
    const { usuario, contrasena } = req.body;

    try {

        const result = await sqlPool.request()`EXEC IniciarSesion @Usuario=${usuario}, @Contrasena=${contrasena}`;

        if (result.recordset[0].AutenticacionExitosa) {
            res.json({ message: 'Autenticación exitosa.' });
        } else {
            res.status(401).json({ message: 'Autenticación fallida.' });
        }
    } catch (err) {
        console.error('Error durante la autenticación:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

//VEHICULOS
app.post('/vehiculos', async (req, res) => {
    const { idTipoVehiculo, idColor, idCombustible, año, idMarca, idTransmision, Estado = 'Disponible' } = req.body;
    console.log("INSERT VEHICULOS");
    console.log(req.body);
    console.log(idTipoVehiculo);
    console.log(idColor);
    console.log(idCombustible);
    console.log(año);
    console.log(idMarca);
    console.log(idTransmision);

    try {

        const result = await sqlPool.request()
            .input('IDTipo', sql.VarChar, idTipoVehiculo)
            .input('Color', sql.NVarChar, idColor)
            .input('TipoCombustible', sql.NVarChar, idCombustible)
            .input('Año', sql.Int, año)
            .input('Marca', sql.NVarChar, idMarca)
            .input('IdTransmision', sql.NVarChar, idTransmision)
            .input('Estado', sql.VarChar, Estado)
            .execute('RegistrarVehiculo');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Vehículo registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el vehículo' });
        }
    } catch (err) {
        console.error('Error durante el registro del vehículo:', err);
        res.status(500).json({ message: err.message });
    }
});


app.delete('/vehiculos/:id', async (req, res) => {
    const { id } = req.params;

    try {

        const result = await sqlPool.request()
            .input('Identificacion', sql.VarChar, id)
            .execute('EliminarVehiculo');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Vehículo eliminado exitosamente' });
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (err) {
        console.error('Error al eliminar el vehículo:', err);
        res.status(500).json({ message: err.message });
    }
});
// VEHICULOS - Consultar vehículos
app.get('/vehiculos', async (req, res) => {
    const { estado, tipoVehiculo, marca, transmision, color, combustible } = req.query;
    console.log("SELECT VEHICULOS")
    console.log(req.query)
    try {
        const result = await sqlPool.request()
            .input('Estado', sql.NVarChar, estado || null)
            .input('TipoVehiculo', sql.NVarChar, tipoVehiculo || null)
            .input('Marca', sql.NVarChar, marca || null)
            .input('Transmision', sql.NVarChar, transmision || null)
            .input('Color', sql.NVarChar, color || null)
            .input('Combustible', sql.NVarChar, combustible || null)
            .execute('ConsultarVehiculo');

        if (result.recordset.length > 0) {
            res.json(result.recordset);
        } else {
            res.status(404).json({ message: 'No se encontraron vehículos con los criterios especificados.' });
        }
    } catch (err) {
        console.error('Error al consultar vehículos:', err);
        res.status(500).json({ message: 'Error interno del servidor.', details: err.message });
    }
});
app.get('/vehiculos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await sqlPool.request()
            .input('IDVehiculo', sql.VarChar, id)
            .execute('ConsultarVehiculo'); // Ensure this stored procedure is designed to handle a single ID input

        if (result.recordset.length > 0) {
            res.json(result.recordset[0]); // Return only the first record for a specific ID
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (err) {
        console.error('Error al consultar vehículo:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

app.put('/vehiculos/:id', async (req, res) => {
    const { id } = req.params;
    const { IDTipo, Color, TipoCombustible, Año, Marca, IdTransmision, Estado } = req.body;

    console.log('MODIFICAR VEHICULO');
    console.log(req.params);
    console.log(req.body);

    try {
        const result = await sqlPool.request()
            .input('IDVehiculo', sql.VarChar, id)
            .input('IDTipo', sql.Int, IDTipo)  // Assuming IDTipo is an integer. Adjust type accordingly.
            .input('Color', sql.Int, Color)  // Adjust type accordingly if not an integer.
            .input('TipoCombustible', sql.Int, TipoCombustible)  // Adjust type accordingly.
            .input('Año', sql.Int, Año)
            .input('Marca', sql.Int, Marca)  // Adjust type accordingly if not an integer.
            .input('IdTransmision', sql.Int, IdTransmision)  // Adjust type accordingly.
            .input('Estado', sql.NVarChar, Estado)
            .execute('ModificarVehiculo');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Vehículo modificado exitosamente' });
        } else {
            res.status(404).json({ message: 'Vehículo no encontrado' });
        }
    } catch (err) {
        console.error('Error al modificar el vehículo:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});






//CATALOGOS
//PAIS
app.get('/paises', async (req, res) => {

    console.log('SELECT PAISES');

    try {

        const result = await sqlPool.request()
            .query('SELECT * FROM PaisResidencia');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar paises:', err);
        res.status(500).json({ message: err.message });
    }
});
app.get('/color', async (req, res) => {

    console.log('SELECT COLORES');
    try {
        const result = await sqlPool.request()
            .query('SELECT * FROM Color');

        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar colores:', err);
        res.status(500).json({ message: err.message });
    }
});

app.post('/color', async (req, res) => {
    const { nombreColor } = req.body;
    console.log('Insert color')
    console.log(req.body);

    try {

        const result = await sqlPool.request()
            .query(`INSERT INTO Color (nombreColor) VALUES ('${nombreColor}')`);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Vehículo registrado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo registrar el vehículo' });
        }

        console.log(result.recordset);
    } catch (err) {
        console.error('Error al insertar colores:', err);
        res.status(500).json({ message: err.message });
    }
});

app.delete('/color/:idColor', async (req, res) => {
    const { idColor } = req.params;
    try {
        const result = await sqlPool.request()
            .query(`Delete from Color where idColor = '${idColor}' `);
        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Color eliminado exitosamente' });
        } else {
            res.status(400).json({ message: 'No se pudo eliminar el color' });
        }
        console.log(result.recordset);
    } catch (error) {
        console.error('Error al borrar colores:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/color/:idColor', async (req, res) => {
    const {idColor} =req.params;
    console.log('SELECT COLORES');
    try {
        const result = await sqlPool.request()
            .query(`SELECT * FROM Color WHERE idColor = '${idColor}'`);
        res.json(result.recordset);
        console.log(result.recordset);
    } catch (err) {
        console.error('Error al consultar colores:', err);
        res.status(500).json({ message: err.message });
    }
});

app.put('/color/:idColor', async (req, res) => {
    const { idColor } = req.params;
    const { nombreColor } = req.body;
    console.log('MODIFICAR COLOR');
    console.log(req.params);
    console.log(req.body);

    try {
        const result = await sqlPool.request()
            .input('IdColor', sql.Int, idColor)
            .input('NombreColor', sql.VarChar, nombreColor)
            .query('UPDATE Color set nombreColor = @NombreColor where idColor= @IdColor'); 
            if (result.rowsAffected[0] > 0) {
                res.json({ message: 'Color modificado exitosamente' });
            } else {
                res.status(400).json({ message: 'No se pudo modificar el color' });
            }
        } catch (err) {
            console.error('Error durante el registro del vehículo:', err);
            res.status(500).json({ message: err.message });
        }

})

app.get('/combustible', async (req, res) => {

    console.log('SELECT COMBUSTIBLE');

    try {

        const result = await sqlPool.request()
            .query('SELECT * FROM Combustible');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar combustibles:', err);
        res.status(500).json({ message: err.message });
    }
});
app.get('/marca', async (req, res) => {

    console.log('SELECT Marcas');

    try {

        const result = await sqlPool.request()
            .query('SELECT * FROM marca');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar marcas:', err);
        res.status(500).json({ message: err.message });
    }
});
app.get('/tipoVehiculo', async (req, res) => {

    console.log('SELECT TIPOVEHICULOS');

    try {

        const result = await sqlPool.request()
            .query('SELECT * FROM tipoVehiculo');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar tipoVehiculo:', err);
        res.status(500).json({ message: err.message });
    }
});
app.get('/transmision', async (req, res) => {

    console.log('SELECT TRANSMISIONES');

    try {

        const result = await sqlPool.request()
            .query('SELECT * FROM Transmision');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar paises:', err);
        res.status(500).json({ message: err.message });
    }
});
app.get('/tipoClientes', async (req, res) => {

    console.log('SELECT tipoCliente');

    try {

        const result = await sqlPool.request()
            .query('SELECT * FROM TipoCliente');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar Tipo Cliente:', err);
        res.status(500).json({ message: err.message });
    }
});

//CLIENTES
//SELECT *
app.get('/clientes', async (req, res) => {
    const { tipoCliente, identificacion } = req.query;
    console.log('SELECT Clientes');

    console.log(req.query);
    try {

        const result = await sqlPool.request()
            .input('Identificacion', sql.VarChar, identificacion || null)
            .input('TipoCliente', sql.NVarChar, tipoCliente || null)
            .execute('ConsultarCliente');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar clientes:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/clientesID', async (req, res) => {
    const { identificacion } = req.query;
    console.log('SELECT Clientes por identificación:', identificacion);

    if (!identificacion) {
        return res.status(400).json({ message: "Identificación es requerida" });
    }

    try {
        const result = await sqlPool.request()
            .input('Identificacion', sql.VarChar, identificacion)
            .query('SELECT * FROM Clientes WHERE id = @identificacion');

        const cliente = result.recordset[0];
        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }
        res.json(cliente);
    } catch (err) {
        console.error('Error al consultar cliente:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});

app.get('/clientesTipo', async (req, res) => {
    const { tipoCliente } = req.query;
    console.log('SELECT Clientes');
    console.log(req);
    console.log(req.query);
    try {

        const result = await sqlPool.request()
            .input('Identificacion', null)
            .input('TipoCliente', sql.NVarChar, tipoCliente)
            .execute('ConsultarCliente');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al consultar clientes:', err);
        res.status(500).json({ message: err.message });
    }
});
//INSERT
app.post('/clientes', async (req, res) => {
    const { nombre, apellidos, identificacion, telefono, paisResidencia, direccion, tipoCliente } = req.body;

    console.log('INSERT CLIENTE');
    console.log(req.body);
    console.log('Nombre:', nombre);
    console.log('Apellidos:', apellidos);
    console.log('Identificacion:', identificacion);
    console.log('Telefono:', telefono);
    console.log('PaisResidencia:', paisResidencia);
    console.log('Direccion:', direccion);
    console.log('TipoCliente:', tipoCliente);
    try {

        const result = await sqlPool.request()
            .input('Nombre', sql.NVarChar, nombre)
            .input('Apellidos', sql.NVarChar, apellidos)
            .input('Identificacion', sql.VarChar, identificacion)
            .input('Telefono', sql.VarChar, telefono)
            .input('PaisResidencia', sql.VarChar, paisResidencia)
            .input('Direccion', sql.NVarChar, direccion)
            .input('TipoCliente', sql.NVarChar, tipoCliente)
            .execute('AgregarCliente');

        res.json({ message: 'Cliente agregado exitosamente' });
    } catch (err) {
        console.error('Error al agregar el cliente:', err);
        if (err.number === 50000) {
            res.status(400).json({ message: err.originalError.info.message });
        } else {
            res.status(500).json({ message: 'Error interno del servidor' });
        }
    }
});
app.delete('/clientes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await sql.connect(sqlConfig);
        const result = await sqlPool.request()
            .input('Identificacion', sql.VarChar, id)
            .execute('EliminarCliente');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Cliente eliminado exitosamente' });
        } else {
            res.status(404).json({ message: 'Cliente no encontrado' });
        }
    } catch (err) {
        console.error('Error al eliminar el cliente:', err);
        res.status(500).json({ message: err.message });
    }
});
app.put('/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellidos, identificacion, telefono, paisResidencia, direccion, tipoCliente } = req.body;
    console.log("MODIFICAR CLIENTE");
    console.log(req.params);
    console.log(req.body);

    try {
        const result = await sqlPool.request()
            .input('ID', sql.Int, id)
            .input('Nombre', sql.NVarChar, nombre)
            .input('Apellidos', sql.NVarChar, apellidos)
            .input('Identificacion', sql.VarChar, identificacion)
            .input('Telefono', sql.VarChar, telefono)
            .input('PaisResidencia', sql.VarChar, String(paisResidencia))
            .input('Direccion', sql.NVarChar, direccion)
            .input('TipoCliente', sql.NVarChar, String(tipoCliente))
            .execute('ModificarCliente');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Cliente modificado con éxito' });
        } else {
            res.status(404).send('Cliente no encontrado');
        }
    } catch (err) {
        console.error('Error al modificar el cliente:', err);
        res.status(500).json({ message: 'Error interno del servidor', details: err.message });
    }
});







// Inicia el servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
