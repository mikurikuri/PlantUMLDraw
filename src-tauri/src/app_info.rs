use serde::Serialize;

/// フロントエンドに返すアプリ情報
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}

impl AppInfo {
    pub fn current() -> Self {
        Self {
            name: "PlantUMLDraw".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn current_uses_cargo_version() {
        let info = AppInfo::current();
        assert_eq!(info.name, "PlantUMLDraw");
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn serializes_as_camel_compatible_json() {
        let json = serde_json::to_value(AppInfo::current()).unwrap();
        assert_eq!(json["name"], "PlantUMLDraw");
        assert!(json["version"].is_string());
    }
}
