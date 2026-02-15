# letters from rushil

simple letter sharing for me (and for you!)

## quick start

### 1. clone the repo

```bash
git clone
cp .env.sample .env
cp codes.json.sample codes.json
```

### 2a. deploy with node

```bash
npm install
npm start
```

### 2b. deploy with docker

```bash
docker build -t letters .
docker run -d -p 3000:3000 --name letters letters
```

## how to use

### 1. edit `upload/codes.json`

add a new (4 character, alphanumeric) code and the corresponding folder where the letter is stored

```json
{
  "codes": {
    "AB12": "mike",
    "CD34": "sarah",
    "EF56": "emma" // add new code here
  }
}
```

### 2. create their letter folder

```bash
mkdir -p upload/emma
```

### 3. drop new files into the folder

```bash
upload/emma
├── 012525
│   └── letter.pdf
└── 021426
    ├── letter.txt
    └── voice-note.mp3
```

### 4. give them the code

include the 4-character code in your first letter!

```text
made with ❤️ by rushil
```
