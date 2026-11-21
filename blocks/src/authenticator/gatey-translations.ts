import type { TranslationCatalog } from "./scoped-translations";

export const signInMessages = {
  checking: "Checking credentials…",
  signingIn: "Signing in…",
  signingOut: "Signing out…",
  redirecting: "Redirecting…",
  wordpressSessionFailed:
    "The WordPress session could not be restored. Check that cookies are enabled, then open the page again in a new tab.",
} as const;

export const signInStatusTranslations: TranslationCatalog = {
  de: {
    [signInMessages.checking]: "Anmeldedaten werden geprüft …",
    [signInMessages.signingIn]: "Anmeldung läuft …",
    [signInMessages.signingOut]: "Abmeldung läuft …",
    [signInMessages.redirecting]: "Weiterleitung läuft …",
    [signInMessages.wordpressSessionFailed]:
      "Die WordPress-Sitzung konnte nicht wiederhergestellt werden. Prüfen Sie, ob Cookies aktiviert sind, und öffnen Sie die Seite erneut in einem neuen Tab.",
  },
  es: {
    [signInMessages.checking]: "Comprobando las credenciales…",
    [signInMessages.signingIn]: "Iniciando sesión…",
    [signInMessages.signingOut]: "Cerrando sesión…",
    [signInMessages.redirecting]: "Redirigiendo…",
    [signInMessages.wordpressSessionFailed]:
      "No se pudo restablecer la sesión de WordPress. Compruebe que las cookies estén habilitadas y vuelva a abrir la página en una pestaña nueva.",
  },
  fr: {
    [signInMessages.checking]: "Vérification des identifiants…",
    [signInMessages.signingIn]: "Connexion en cours…",
    [signInMessages.signingOut]: "Déconnexion en cours…",
    [signInMessages.redirecting]: "Redirection en cours…",
    [signInMessages.wordpressSessionFailed]:
      "La session WordPress n’a pas pu être rétablie. Vérifiez que les cookies sont activés, puis rouvrez la page dans un nouvel onglet.",
  },
  hu: {
    [signInMessages.checking]: "A bejelentkezési adatok ellenőrzése…",
    [signInMessages.signingIn]: "Bejelentkezés…",
    [signInMessages.signingOut]: "Kijelentkezés…",
    [signInMessages.redirecting]: "Átirányítás…",
    [signInMessages.wordpressSessionFailed]:
      "A WordPress-munkamenetet nem sikerült helyreállítani. Ellenőrizze, hogy a sütik engedélyezve vannak-e, majd nyissa meg újra az oldalt egy új lapon.",
  },
};

export const guardianReturnMessages = {
  checking: "Checking access to this page…",
  cookieMissing:
    "This page could not verify the access cookie. Check that cookies are enabled, then open the page again in a new tab.",
  denied: "Your account does not have access to this page.",
  unavailable: "Access could not be verified. Try opening the protected page again.",
} as const;

export const guardianReturnTranslations: TranslationCatalog = {
  de: {
    [guardianReturnMessages.checking]: "Zugriff auf diese Seite wird geprüft …",
    [guardianReturnMessages.cookieMissing]:
      "Das Zugriffs-Cookie konnte nicht bestätigt werden. Prüfen Sie, ob Cookies aktiviert sind, und öffnen Sie die Seite erneut in einem neuen Tab.",
    [guardianReturnMessages.denied]: "Ihr Konto hat keinen Zugriff auf diese Seite.",
    [guardianReturnMessages.unavailable]:
      "Der Zugriff konnte nicht bestätigt werden. Öffnen Sie die geschützte Seite bitte erneut.",
  },
  es: {
    [guardianReturnMessages.checking]: "Comprobando el acceso a esta página…",
    [guardianReturnMessages.cookieMissing]:
      "No se pudo verificar la cookie de acceso. Compruebe que las cookies estén habilitadas y vuelva a abrir la página en una pestaña nueva.",
    [guardianReturnMessages.denied]: "Su cuenta no tiene acceso a esta página.",
    [guardianReturnMessages.unavailable]:
      "No se pudo verificar el acceso. Vuelva a abrir la página protegida.",
  },
  fr: {
    [guardianReturnMessages.checking]: "Vérification de l’accès à cette page…",
    [guardianReturnMessages.cookieMissing]:
      "Impossible de vérifier le cookie d’accès. Vérifiez que les cookies sont activés, puis rouvrez la page dans un nouvel onglet.",
    [guardianReturnMessages.denied]: "Votre compte n’a pas accès à cette page.",
    [guardianReturnMessages.unavailable]:
      "Impossible de vérifier l’accès. Veuillez rouvrir la page protégée.",
  },
  hu: {
    [guardianReturnMessages.checking]: "Az oldalhoz való hozzáférés ellenőrzése…",
    [guardianReturnMessages.cookieMissing]:
      "A hozzáférési sütit nem sikerült ellenőrizni. Ellenőrizze, hogy a sütik engedélyezve vannak-e, majd nyissa meg újra az oldalt egy új lapon.",
    [guardianReturnMessages.denied]: "A fiókja nem jogosult az oldal megtekintésére.",
    [guardianReturnMessages.unavailable]:
      "A hozzáférést nem sikerült ellenőrizni. Nyissa meg újra a védett oldalt.",
  },
};

/**
 * Gatey-owned corrections layered over the upstream Authenticator catalog.
 * Site-authored custom translations are applied after these values and remain
 * fully in the site's control.
 */
export const gateyAuthenticatorTranslations: TranslationCatalog = {
  es: {
    "Add your Profile": "Agregue su perfil",
    "After removal, this device may be asked for multi-factor authentication the next time you sign in.":
      "Tras eliminarlo, es posible que este dispositivo solicite autenticación multifactor la próxima vez que inicie sesión.",
    "After removal, this passkey can no longer be used to sign in. You can still reset your password using your verified email address.":
      "Tras eliminarla, esta clave de acceso ya no podrá usarse para iniciar sesión. Aún puede restablecer su contraseña mediante su dirección de correo electrónico verificada.",
    "Authenticate using a code generated by an app installed on your mobile device or computer":
      "Autentíquese con un código generado por una aplicación instalada en su dispositivo móvil o computadora",
    "Authenticate using a code sent via email":
      "Autentíquese con un código enviado por correo electrónico",
    "Authenticate using a code sent via SMS":
      "Autentíquese con un código enviado por SMS",
    "Configuration error (see console) – please contact the administrator":
      "Error de configuración (ver consola) – comuníquese con el administrador",
    "Copy and paste the secret key below into an authenticator app and then enter the code in the text field below.":
      "Copie y pegue la clave secreta que aparece a continuación en una aplicación de autenticación y luego ingrese el código en el campo de texto.",
    "Deleting your account is not reversible. You will lose access to your account and all data associated with it.":
      "Eliminar su cuenta es una acción irreversible. Perderá el acceso a su cuenta y a todos los datos asociados.",
    "Enter your code and your new password.":
      "Ingrese su código y su nueva contraseña.",
    "Failed to create passkey. Please try again.":
      "No se pudo crear la clave de acceso. Inténtelo de nuevo.",
    "Forgot Password?": "¿Ha olvidado su contraseña?",
    "Forgot password?": "¿Ha olvidado su contraseña?",
    "Have an account? ": "¿Tiene una cuenta?",
    "Lost your code?": "¿Perdió su código?",
    "Lost your code? ": "¿Perdió su código?",
    "Manage devices that Cognito remembers so they may not need multi-factor authentication on a later sign-in.":
      "Administre los dispositivos que Cognito recuerda para que no necesiten autenticación multifactor en inicios de sesión posteriores.",
    "Manage the passkeys you use to sign in to your account.":
      "Administre las claves de acceso que usa para iniciar sesión en su cuenta.",
    "Passkey authentication was canceled. Please try again or use a different sign-in method.":
      "La autenticación con clave de acceso fue cancelada. Inténtelo de nuevo o use otro método de inicio de sesión.",
    "Passkeys are WebAuthn credentials that validate your identity using biometric data like touch or facial recognition or device authentication like passwords or PINs, serving as a secure password replacement.":
      "Las claves de acceso son credenciales WebAuthn que verifican su identidad mediante datos biométricos como huella dactilar o reconocimiento facial, o autenticación del dispositivo como contraseñas o PIN, y sirven como reemplazo seguro de las contraseñas.",
    "Passwordless authentication is not enabled for this account. Please contact your administrator or use password sign-in.":
      "La autenticación sin contraseña no está habilitada para esta cuenta. Comuníquese con su administrador o inicie sesión con contraseña.",
    "Please enter a valid email": "Ingrese un correo electrónico válido",
    "Please enter your username first":
      "Ingrese primero su nombre de usuario",
    "Sign in faster with Passkey":
      "Inicie sesión más rápido con una clave de acceso",
    "Sign in to your account": "Iniciar sesión en su cuenta",
    "The verification code you entered is incorrect. Please try again.":
      "El código de verificación ingresado es incorrecto. Inténtelo de nuevo.",
    "Unable to send verification code. Please try again.":
      "No se pudo enviar el código de verificación. Inténtelo de nuevo.",
    "We have sent a password reset code":
      "Hemos enviado un código para restablecer su contraseña",
    "We have sent a password reset code in an Email message to":
      "Hemos enviado un código para restablecer su contraseña por correo electrónico a",
    "We have sent a password reset code in an SMS message to":
      "Hemos enviado un código para restablecer su contraseña por SMS a",
    "Your code is on the way. To update your email address, enter the code we emailed to":
      "Su código está en camino. Para actualizar su dirección de correo electrónico, ingrese el código que enviamos a",
    "Your code is on the way. To update your phone number, enter the code we texted to":
      "Su código está en camino. Para actualizar su número de teléfono, ingrese el código que enviamos por SMS a",
    "Your passkey has been successfully registered.":
      "Su clave de acceso se ha registrado correctamente.",
    "Your verification code has expired. Please request a new code.":
      "Su código de verificación ha expirado. Solicite un nuevo código.",
  },
  hu: {
    "Lost your code?": "Elvesztette a kódját?",
    "Lost your code? ": "Elvesztette a kódját?",
  },
};
