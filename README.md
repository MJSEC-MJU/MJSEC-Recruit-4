# MJSEC-Recruit-4
MJSEC 4기 입부문제입니다~
https://recruit.mjsec.kr/
수박게임 10000점을 얻고, 4기 신입부원 톡방 주소와 코드를 얻어보세요!!

## 실행 방법

1. 의존성 설치
   ```bash
   pip install -r requirements.txt
   ```
2. 데이터베이스 초기화
   ```bash
   python manage.py migrate
   ```
3. 개발 서버 실행
   ```bash
   python manage.py runserver
   ```
4. 브라우저에서 `http://127.0.0.1:8000/` 접속 후 점수 배수(1x/2x/4x)를 선택해 게임을 시작하세요.

## 플레이 요약

- 캔버스를 클릭하거나 터치하면 해당 위치로 과일이 즉시 떨어집니다. 좌우 방향키로 미세 조준 후 Space/Enter 키로 떨어뜨릴 수도 있습니다.
- 동일한 단계의 원형 과일이 충돌하면 한 단계 큰 과일로 합쳐지고 선택한 배수만큼 점수가 증가합니다.
- 점수가 10,000점에 도달하면 클라이언트가 서버에 점수를 보고하며, 서버 검증 후에만 플래그가 응답으로 주어져 화면에 표시됩니다.

## Docker 실행

프로덕션 설정을 확인하거나 로컬에서 컨테이너로 실행하려면 Dockerfile을 사용하세요.

```bash
docker build -t suika-game .
docker run --env-file .env -p 8000:8000 suika-game
```

컨테이너는 시작 시 마이그레이션과 정적 파일 수집을 수행한 뒤 Gunicorn으로 서비스를 구동합니다. `.env` 파일에는 최소한 `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` 등의 값이 포함되어야 합니다.

## CI / CD 파이프라인

- `.github/workflows/ci.yml`은 모든 브랜치의 push / PR마다 Django 체크와 테스트, Docker 빌드를 수행합니다.
- `.github/workflows/cd-ssh.yml`은 `main` 브랜치와 `v*.*.*` 태그 push 시 Docker Hub로 이미지를 빌드/푸시하고, SSH로 원격 서버에서 `docker-compose.prod.yml`을 이용해 최신 이미지를 기동합니다.

필요한 GitHub Secrets:

| 이름 | 설명 |
| --- | --- |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` | Docker Hub 인증 정보 |
| `GCP_SSH_KEY`, `GCP_HOST`, `GCP_USER`, `GCP_HOST_KEY`(선택) | 배포 대상 서버 접속 정보 |
| `REMOTE_APP_DIR` | 원격 서버에 앱이 배치될 경로 |

원격 서버에는 Django 환경 변수가 담긴 `.env` 파일이 `REMOTE_APP_DIR` 하위에 존재해야 합니다.