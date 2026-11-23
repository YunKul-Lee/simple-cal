# syntax=docker/dockerfile:1

# 1단계: Gradle로 실행 가능한 jar 빌드
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
# 빌드 정의만 먼저 복사해 의존성 다운로드 레이어를 소스 변경과 분리한다
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN --mount=type=cache,id=gradle,target=/root/.gradle \
    ./gradlew dependencies --no-daemon > /dev/null
COPY src src
# 테스트는 Testcontainers가 Docker를 써야 해서 이미지 빌드에서는 빼고 밖에서 ./gradlew test로 돌린다
RUN --mount=type=cache,id=gradle,target=/root/.gradle \
    ./gradlew bootJar -x test --no-daemon

# 2단계: JRE만으로 실행 (비루트)
FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --no-create-home app
COPY --from=build /app/build/libs/*.jar app.jar
USER app
# 힙을 컨테이너 메모리 제한에 맞춘다 (JVM 기본값은 25%)
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
