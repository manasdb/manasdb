pub enum HashAlgorithm {
    BLAKE3,
    SHA256,
    SHA3,
}

pub struct Hasher {
    algorithm: HashAlgorithm,
}

impl Default for Hasher {
    fn default() -> Self {
        Self::new(HashAlgorithm::BLAKE3)
    }
}

impl Hasher {
    pub fn new(algorithm: HashAlgorithm) -> Self {
        Self { algorithm }
    }

    pub fn hash_bytes(&self, data: &[u8]) -> String {
        match self.algorithm {
            HashAlgorithm::BLAKE3 => {
                let hash = blake3::hash(data);
                hash.to_hex().to_string()
            }
            HashAlgorithm::SHA256 => unimplemented!("SHA256 not yet supported"),
            HashAlgorithm::SHA3 => unimplemented!("SHA3 not yet supported"),
        }
    }

    pub fn hash_text(&self, text: &str) -> String {
        self.hash_bytes(text.as_bytes())
    }
}
