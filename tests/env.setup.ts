// Se ejecuta ANTES de que cualquier test importe src/config/env.ts. dotenv
// (usado ahí) nunca pisa una variable que ya esté en process.env, así que
// fijar estas acá garantiza que la app de pruebas use SIEMPRE la base de
// datos de pruebas, nunca la real — sin importar qué .env exista en el
// servidor donde corra Jenkins.
process.env.NODE_ENV = "test";
process.env.PGHOST = process.env.TEST_PGHOST ?? "127.0.0.1";
process.env.PGPORT = process.env.TEST_PGPORT ?? "5432";
process.env.PGDATABASE = process.env.TEST_PGDATABASE ?? "carta_digital_test";
process.env.PGUSER = process.env.TEST_PGUSER ?? "carta_test";
process.env.PGPASSWORD = process.env.TEST_PGPASSWORD ?? "jenkins_test_only_2026";
process.env.SESSION_SECRET = "secreto-de-pruebas-no-usar-en-produccion";
process.env.SESSION_SECURE_COOKIE = "false";
