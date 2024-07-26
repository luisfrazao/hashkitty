# ![estg_h_branco](https://github.com/user-attachments/assets/cf71a428-607a-41e9-bb5a-60894e624ead)


# ![hashkitty-logo](https://github.com/user-attachments/assets/c7281a7c-abf8-4e45-8d4a-5571d6384bb5)



# HashKitty_v2
Plataforma distribuída multissistema para processamento e análise de hashes de passwords.

![GitHub License](https://img.shields.io/github/license/luisfrazao/hashkitty)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.12726688.svg)](https://doi.org/10.5281/zenodo.12726688)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.12726812.svg)](https://doi.org/10.5281/zenodo.12726812)


## Descrição
HashKitty é uma plataforma distribuída multissistema de análise de hashes de passwords baseada no Hashcat, desenvolvida como um projeto académico no ano letivo de 2023-2024.

Com o aumento da preocupação com a segurança informática, a necessidade de analisar a segurança das passwords tem crescido significativamente. O Hashcat é uma das ferramentas mais populares para análise de hashes, utilizando principalmente GPUs para o processamento.

O objetivo do HashKitty é criar uma solução distribuída e escalável que simplifique o uso do Hashcat, utilizando recursos de vários nós computacionais distribuídos geograficamente. O projeto envolve a investigação e desenvolvimento de uma arquitetura de gestão distribuída, comunicação segura entre nós, e distribuição eficiente de tarefas de análise.

### Objetivos do Projeto:
- Caracterizar a ferramenta Hashcat e analisar trabalhos relacionados.
- Desenvolver uma solução que permita:
  - Interligar vários nós computacionais com uma plataforma central.
  - Permitir nós computacionais com diferentes equipamentos e fabricantes.
  - Distribuir tarefas entre os nós através de uma plataforma Web.
  - Analisar passwords e outros dados de forma distribuída.
- Criar um relatório final com toda a investigação, protótipos desenvolvidos e testes realizados.

# Gráfico da arquitetura
![ProjetoInformaticoDiagrama](https://github.com/monico18/HashKitty_v2/assets/126672884/60109d38-b67d-41ab-8021-a3d44e7749db)

# Cenário de teste baseado na arquitetura
![CenárioTeste](https://github.com/monico18/HashKitty_v2/assets/126672884/5719a797-99bf-450a-8154-00f7cff74eb4)

## Tecnologias Utilizadas
- **WebApp:**
  - API: Node.js, Sequelize, Express
  - DB: MariaDB
  - Frontend: Vue
- **Middleware:** Python
- **Agent:** Python

## Instalação
### Middleware
#### Como instalar:
1. Extraia os arquivos:
    ```sh
    tar -xvf MiddlewareInstaller.tar.xz
    ```
2. Execute o instalador com sudo:
    ```sh
    sudo ./installer.sh
    ```
3. Insira a URL da API (ex: http://localhost:3000).
4. Insira o nome e descrição para o Middleware.
5. Acesse o painel de administração e aceite o Middleware.
6. Copie e cole a senha gerada.
7. O instalador irá automaticamente iniciar e habilitar o serviço `Hashkitty-middleware.service`.

#### Como desinstalar:
1. Execute o desinstalador com sudo:
    ```sh
    sudo ./installer.sh -u
    ```

### Agent
#### Linux
##### Pré-requisitos:
- Hashcat instalado no sistema.

##### Como instalar:
1. Extraia os arquivos:
    ```sh
    tar -xvf LinuxInstaller.tar.xz
    ```
2. Execute o instalador com sudo:
    ```sh
    sudo ./installer.sh
    ```
3. Insira o domínio ou IP do Middleware.
4. O instalador irá automaticamente iniciar e habilitar o serviço `Hashkitty-agent.service`.

##### Como desinstalar:
1. Execute o desinstalador com sudo:
    ```sh
    sudo ./installer.sh -u
    ```
#### Windows

##### How to install:

  1. Run `AgentInstaller.exe` to initiate the installer
  2. Insert the websocket URL for the middleware
  3. Click Next and let the installation finish
  4. A new folder is created in the Program Files x86 called HashKittyAgent
  5. To run the Agent.exe you have the run it as an administrator

##### How to uninstall:

  Run the uninstaller that is in the folder that was created with the installation


## Licença
Este projeto está licenciado sob os termos da licença GNU GPL-2.0. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

## Autores
- Pedro Antunes - 2211045
- Tomás Santos - 2201762

## Orientadores
- Daniel Fuentes - [daniel.fuentes@ipleiria.pt](mailto:daniel.fuentes@ipleiria.pt)
- Luis Frazao - [luis.frazao@ipleiria.pt](mailto:luis.frazao@ipleiria.pt)

