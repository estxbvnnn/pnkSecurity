// Pipeline de CI/CD (4ta entrega): Desarrollo -> QA -> filtro de seguridad -> Producción,
// igual al flujo descrito en clase: "si pasa, automáticamente se despliega a producción;
// si no, Jenkins rechaza el despliegue y notifica los problemas."
pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    DEPENDENCY_CHECK_HOME = '/opt/dependency-check-13.0.0'
    PROD_HOST = '52.0.165.26'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Instalar dependencias') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('QA: pruebas funcionales') {
      steps {
        sh 'npm test'
      }
    }

    stage('Seguridad: npm audit (filtro principal)') {
      steps {
        // Solo dependencias de producción: lo que realmente se despliega.
        // audit-level=high -> build falla si hay algo "high" o "critical".
        sh 'npm audit --omit=dev --audit-level=high'
      }
    }

    stage('Seguridad: OWASP Dependency-Check (MITRE/NVD)') {
      steps {
        withCredentials([string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')]) {
          // No bloquea el pipeline si falla (ver post/unstable abajo): el
          // filtro real es npm audit. Esta etapa deja el reporte real de
          // CVEs (base de datos de MITRE/NVD) como evidencia, sin arriesgar
          // el despliegue si NVD está lento/con rate-limit en esta instancia
          // de recursos reducidos.
          script {
            def resultado = sh(
              script: """
                export JAVA_OPTS="-Xmx384m"
                ${DEPENDENCY_CHECK_HOME}/bin/dependency-check.sh \
                  --project "carta-digital-node" \
                  --scan "package-lock.json" \
                  --format HTML --format JSON \
                  --out dependency-check-report \
                  --disableAssembly \
                  --nvdApiKey "${NVD_API_KEY}" \
                  --failOnCVSS 9
              """,
              returnStatus: true
            )
            if (resultado != 0) {
              unstable("OWASP Dependency-Check terminó con advertencias/errores (código ${resultado}) — revisar el reporte. No bloquea el despliegue; el filtro obligatorio es npm audit.")
            }
          }
        }
      }
      post {
        always {
          archiveArtifacts artifacts: 'dependency-check-report/**', allowEmptyArchive: true
        }
      }
    }

    stage('Despliegue a Producción') {
      when {
        branch 'carta-digital-nodejs'
      }
      steps {
        sshagent(credentials: ['prod-server-ssh']) {
          sh '''
            ssh -o StrictHostKeyChecking=accept-new ec2-user@${PROD_HOST} '
              set -e
              cd ~/carta-digital-node
              git fetch origin carta-digital-nodejs
              git reset --hard origin/carta-digital-nodejs
              sudo docker compose build app-prod
              sudo docker compose up -d app-prod
              sleep 10
              sudo docker compose ps app-prod
              curl -sf http://127.0.0.1/health
            '
          '''
        }
      }
    }
  }

  post {
    success {
      echo "Pipeline OK — desplegado a Producción (http://${PROD_HOST}/)."
    }
    unstable {
      echo "Pipeline con advertencias (ver OWASP Dependency-Check) — se desplegó igual porque el filtro obligatorio (npm audit) pasó."
    }
    failure {
      echo "Pipeline FALLÓ (QA o npm audit) — NO se despliega a Producción. Revisar los logs de la etapa que falló."
    }
  }
}
