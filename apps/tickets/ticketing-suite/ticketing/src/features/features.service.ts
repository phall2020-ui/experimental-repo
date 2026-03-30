import { Injectable } from '@nestjs/common';

@Injectable()
export class FeaturesService {
  getFeatures() {
    const searchEnabled = !!(
      process.env.OPENSEARCH_NODE &&
      process.env.OPENSEARCH_NODE.trim() !== ''
    );

    const attachmentsEnabled = !!(
      process.env.S3_BUCKET &&
      process.env.S3_BUCKET.trim() !== '' &&
      process.env.AWS_REGION &&
      process.env.AWS_REGION.trim() !== ''
    );

    return {
      search: searchEnabled,
      attachments: attachmentsEnabled,
    };
  }
}
