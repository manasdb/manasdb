pub trait Collector: Send + Sync {
    fn collect(&self, event: &str);
}

pub trait Processor: Send + Sync {
    fn process(&self, event: &str) -> String;
}

pub trait Exporter: Send + Sync {
    fn export(&self, data: &str);
}
