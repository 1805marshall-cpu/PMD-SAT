// ==========================================
// CONFIGURACIÓN DE FIREBASE (COMPAT SDK)
// ==========================================
const firebaseConfig = {
    apiKey: "TU_API_KEY_DE_FIREBASE",
    authDomain: "edm-sat.firebaseapp.com",
    projectId: "edm-sat",
    storageBucket: "edm-sat.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicialización segura de Firebase Compat y Firestore
let db = null;
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
}

// ==========================================
// DICCIONARIO DE CREDENCIALES Y RUTAS LOCALES
// ==========================================
const USUARIOS_SISTEMA = {
    "gobernacion": { pass: "gob2026", dep: "Gobernación y Seguridad Pública", ruta: "departamentos/eje1.html", rol: "departamento" },
    "desarrollo": { pass: "desarrollo2026", dep: "Desarrollo Económico que Genera", ruta: "departamentos/eje2.html", rol: "departamento" },
    "dif": { pass: "dif2026", dep: "Bienestar que se Construye (DIF)", ruta: "departamentos/eje3.html", rol: "departamento" },
    "servicios": { pass: "servicios2026", dep: "Servicios Públicos e Infraestructura", ruta: "departamentos/eje4.html", rol: "departamento" },
    "igualdad": { pass: "igualdad2026", dep: "Igualdad e Inclusión Social", ruta: "departamentos/ejeTransversal.html", rol: "departamento" },
    "admin": { pass: "admin2026", dep: "Administración General", ruta: "dashboard.html", rol: "admin" }
};

// ==========================================
// FUNCIONES GLOBALES DE AUTENTICACIÓN
// ==========================================
window.iniciarSesionUsuario = function(usuario, password) {
    const userKey = usuario.trim().toLowerCase();
    const datosUser = USUARIOS_SISTEMA[userKey];

    if (datosUser && datosUser.pass === password) {
        // Guardar sesión y nombre de usuario en localStorage
        const sesionData = {
            usuario: userKey,
            nombreDep: datosUser.dep,
            ruta: datosUser.ruta,
            rol: datosUser.rol
        };

        localStorage.setItem("sesion_pmd_sat", JSON.stringify(sesionData));
        localStorage.setItem("tipoUsuario", datosUser.rol);
        localStorage.setItem("usuarioNombre", userKey);

        return { exito: true, dep: datosUser.dep, ruta: datosUser.ruta };
    }

    return { exito: false };
};

window.verificarSesionActiva = function(requerirLogin = false) {
    const sesionStr = localStorage.getItem("sesion_pmd_sat");
    if (!sesionStr && requerirLogin) {
        const enSubcarpeta = window.location.pathname.includes('/departamentos/');
        window.location.href = enSubcarpeta ? "../index.html" : "index.html";
        return null;
    }
    return sesionStr ? JSON.parse(sesionStr) : null;
};

window.cerrarSesionBD = function() {
    localStorage.removeItem("sesion_pmd_sat");
    localStorage.removeItem("tipoUsuario");
    localStorage.removeItem("usuarioNombre");
    const enSubcarpeta = window.location.pathname.includes('/departamentos/');
    window.location.href = enSubcarpeta ? "../index.html" : "index.html";
};

// ==========================================
// PROCESAMIENTO OPTIMIZADO DE EVIDENCIAS
// ==========================================
window.procesarArchivoEvidencia = function(inputElement, callback) {
    const archivo = inputElement.files[0];
    if (!archivo) return;

    const lector = new FileReader();

    // Si el usuario subió un documento PDF
    if (archivo.type === 'application/pdf') {
        if (archivo.size > 900 * 1024) {
            alert("⚠️ Aviso: El archivo PDF seleccionado pesa más de 900 KB. Se recomienda adjuntar un PDF optimizado.");
        }

        lector.onload = function(e) {
            const pdfBase64 = e.target.result;
            if (typeof callback === 'function') {
                callback(pdfBase64, archivo.name, 'pdf');
            }
        };
        lector.readAsDataURL(archivo);
        return;
    }

    // Si el usuario subió una imagen (JPG, PNG) -> Alta calidad (1000px, Calidad 0.82)
    lector.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000;
            const MAX_HEIGHT = 1000;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
            
            if (typeof callback === 'function') {
                callback(compressedBase64, archivo.name, 'imagen');
            }
        };
    };
    lector.readAsDataURL(archivo);
};

// ==========================================
// CÁLCULO DE ÍNDICE DE CUMPLIMIENTO (IE)
// ==========================================
window.calcularIndiceCumplimiento = function(programada, alcanzada) {
    const prog = parseFloat(programada) || 1;
    const alc = parseFloat(alcanzada) || 0;
    const porcentaje = ((alc / prog) * 100).toFixed(1);
    
    let nivel = "Bajo";
    let clase = "bg-rose-50 text-rose-700 border-rose-200";
    
    if (porcentaje >= 100) {
        nivel = "Sobrecumplido / Óptimo";
        clase = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (porcentaje >= 75) {
        nivel = "Satisfactorio";
        clase = "bg-amber-50 text-amber-700 border-amber-200";
    }

    return { porcentaje, nivel, clase };
};

// ==========================================
// OPERACIONES CRUD EN FIRESTORE (EDM-SAT)
// ==========================================
const COLECCION_FIRESTORE = "reportes_pmd";

window.guardarReporteBD = async function(datos) {
    if (!db) return { exito: false, error: "Base de datos no inicializada" };
    try {
        const docRef = await db.collection(COLECCION_FIRESTORE).add({
            ...datos,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { exito: true, id: docRef.id };
    } catch (error) {
        console.error("Error al guardar en Firestore:", error);
        return { exito: false, error: error.message };
    }
};

window.obtenerReportesBD = async function() {
    if (!db) return [];
    try {
        const querySnapshot = await db.collection(COLECCION_FIRESTORE).orderBy("fechaCreacion", "desc").get();
        let reportes = [];
        querySnapshot.forEach((doc) => {
            reportes.push({ id: doc.id, ...doc.data() });
        });
        return reportes;
    } catch (error) {
        console.error("Error al obtener reportes:", error);
        return [];
    }
};

window.actualizarReporteBD = async function(id, nuevosDatos) {
    if (!db) return { exito: false };
    try {
        await db.collection(COLECCION_FIRESTORE).doc(id).update(nuevosDatos);
        return { exito: true };
    } catch (error) {
        console.error("Error al actualizar:", error);
        return { exito: false };
    }
};

window.eliminarReporteBD = async function(id) {
    try {
        if (!id) {
            console.error("ID de documento inválido para eliminar.");
            return { exito: false };
        }

        await db.collection(COLECCION_FIRESTORE).doc(id).delete();
        console.log("Documento eliminado correctamente de Firestore:", id);
        return { exito: true };
    } catch (error) {
        console.error("Error al eliminar el documento en Firebase:", error);
        return { exito: false, error: error.message };
    }
};
