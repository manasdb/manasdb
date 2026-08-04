use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use tokenizer::models::WhitespaceTokenizer;
use tokenizer::chunkers::SlidingWindowChunker;
use tokenizer::traits::{Chunker, Tokenizer};
use tokenizer::types::ChunkOptions;

fn generate_paragraphs(count: usize) -> String {
    let paragraph = "This is a synthetic paragraph generated for benchmarking purposes. It contains multiple words to simulate realistic chunking workloads. ";
    let mut s = String::with_capacity(paragraph.len() * count + count * 2);
    for _ in 0..count {
        s.push_str(paragraph);
        s.push_str("\n\n");
    }
    s
}

fn bench_tokenizer(c: &mut Criterion) {
    let mut group = c.benchmark_group("Tokenizer (Whitespace)");
    let tokenizer = WhitespaceTokenizer;

    for count in [1, 10, 100, 1000].iter() {
        let text = generate_paragraphs(*count);
        group.bench_with_input(BenchmarkId::new("tokenize", count), &text, |b, t| {
            b.iter(|| tokenizer.tokenize(black_box(t)).unwrap())
        });
    }
    group.finish();
}

fn bench_chunker(c: &mut Criterion) {
    let mut group = c.benchmark_group("Chunker (Sliding Window)");
    let tokenizer = WhitespaceTokenizer;
    let chunker = SlidingWindowChunker;
    let options = ChunkOptions::default();

    for count in [1, 10, 100, 1000].iter() {
        let text = generate_paragraphs(*count);
        group.bench_with_input(BenchmarkId::new("chunk", count), &text, |b, t| {
            b.iter(|| chunker.chunk(black_box(t), &tokenizer, &options).unwrap())
        });
    }
    group.finish();
}

criterion_group!(benches, bench_tokenizer, bench_chunker);
criterion_main!(benches);
