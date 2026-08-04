use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use vector::math::{cosine_similarity, dot_product, l2_norm};

fn generate_vector(size: usize, seed: f32) -> Vec<f32> {
    (0..size).map(|i| (i as f32 * seed).sin()).collect()
}

fn bench_vector_math(c: &mut Criterion) {
    let mut group = c.benchmark_group("Vector Math");
    
    // Benchmark across representative embedding model dimensions
    let sizes = [128, 256, 384, 512, 768, 1024, 1536, 3072];
    
    for &size in sizes.iter() {
        let v1 = generate_vector(size, 0.1);
        let v2 = generate_vector(size, 0.2);

        group.bench_with_input(BenchmarkId::new("dot_product", size), &size, |b, &_| {
            b.iter(|| dot_product(black_box(&v1), black_box(&v2)).unwrap())
        });

        group.bench_with_input(BenchmarkId::new("cosine_similarity", size), &size, |b, &_| {
            b.iter(|| cosine_similarity(black_box(&v1), black_box(&v2)).unwrap())
        });
        
        group.bench_with_input(BenchmarkId::new("l2_norm", size), &size, |b, &_| {
            b.iter(|| l2_norm(black_box(&v1)).unwrap())
        });
    }
    
    group.finish();
}

criterion_group!(benches, bench_vector_math);
criterion_main!(benches);
