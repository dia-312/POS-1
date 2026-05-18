import sharp from 'sharp';

async function crop() {
  const metadata = await sharp('moodYard.jpeg').metadata();
  const size = Math.min(metadata.width, metadata.height);
  
  await sharp('moodYard.jpeg')
    .extract({
      left: Math.floor((metadata.width - size) / 2),
      top: Math.floor((metadata.height - size) / 2),
      width: size,
      height: size
    })
    .toFile('moodYard_square.png');
}

crop();
