plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "skills.samples"
    compileSdk = libs.versions.compileSdk.get().toInt()
    defaultConfig { minSdk = libs.versions.minSdk.get().toInt() }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    // Samples are generated from the skills' markdown by gen.py on every run.
    sourceSets["main"].kotlin.directories.add("../../.build/generated/kotlin")
    lint {
        abortOnError = true
        warningsAsErrors = true
        checkDependencies = false
        lintConfig = file("lint.xml")
    }
}

kotlin {
    compilerOptions {
        // No deprecated APIs: a deprecation fails the build.
        freeCompilerArgs.add("-Xwarning-level=DEPRECATION:error")
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    // material3 pinned on top of the BOM, the way android-platform teaches it.
    implementation(libs.material3)
    implementation(libs.material3.navigation.suite)
    implementation(libs.adaptive)
    implementation(libs.adaptive.layout)
    implementation(libs.adaptive.navigation)
    implementation(libs.adaptive.navigation3)
    implementation(libs.material.icons.extended)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.test)
    implementation(libs.compose.foundation)
    implementation(libs.compose.animation)
    implementation(libs.activity.compose)
    implementation(libs.navigation3.runtime)
    implementation(libs.navigation3.ui)
    implementation(libs.navigationevent.compose)
    implementation(libs.graphics.shapes)
    implementation(libs.window)
    implementation(libs.serialization.core)
    implementation(libs.lifecycle.viewmodel.navigation3)
}
