import { Router } from 'express';
import { ModelServiceClient } from '../services/modelServiceClient';

export function createModelsRouter(modelClient: ModelServiceClient): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const models = await modelClient.listModels();
      res.json(models);
    } catch (err: any) {
      // Fallback local metadata if service is starting up
      res.json([
        {
          id: 'salesforce-codet5-small',
          displayName: 'CodeT5 Small (60M)',
          publisher: 'Salesforce Research',
          family: 'CodeT5',
          architecture: 'encoder-decoder',
          checkpoint: 'Salesforce/codet5-small',
          revision: 'b1ee9570c289f21b5922b9c768a1ce12957bf968',
          tokenizer: 'Salesforce/codet5-small',
          license: 'BSD-3-Clause',
          supportedTasks: ['code-to-code'],
          supportedLanguages: ['python', 'java'],
          parameterCount: 60492288,
          status: 'AVAILABLE',
          fineTuningStatus: 'PRETRAINED_ONLY',
          limitations: ['Pretrained-only baseline requires translation fine-tuning for valid multi-line target code']
        },
        {
          id: 'salesforce-codet5-base',
          displayName: 'CodeT5 Base (220M)',
          publisher: 'Salesforce Research',
          family: 'CodeT5',
          architecture: 'encoder-decoder',
          checkpoint: 'Salesforce/codet5-base',
          revision: '02cd2d31bb7c6d0e4d91156167b2de044989c733',
          tokenizer: 'Salesforce/codet5-base',
          license: 'BSD-3-Clause',
          supportedTasks: ['code-to-code'],
          supportedLanguages: ['python', 'java'],
          parameterCount: 222882048,
          status: 'AVAILABLE',
          fineTuningStatus: 'PRETRAINED_ONLY',
          limitations: ['Higher memory footprint on CPU']
        },
        {
          id: 'uclanlp-plbart-base',
          displayName: 'PLBART Base (140M)',
          publisher: 'UCLA / Columbia NLP',
          family: 'PLBART',
          architecture: 'encoder-decoder',
          checkpoint: 'uclanlp/plbart-base',
          revision: 'main',
          tokenizer: 'uclanlp/plbart-base',
          license: 'MIT',
          supportedTasks: ['code-to-code'],
          supportedLanguages: ['python', 'java'],
          parameterCount: 139220736,
          status: 'AVAILABLE',
          fineTuningStatus: 'PRETRAINED_ONLY',
          limitations: ['Pretrained denoising autoencoder copies/reconstructs code unless fine-tuned on parallel data']
        },
        {
          id: 'facebook-transcoder',
          displayName: 'TransCoder (Unsupervised Seq2Seq)',
          publisher: 'Meta / Facebook AI Research',
          family: 'TransCoder',
          architecture: 'encoder-decoder',
          checkpoint: 'facebookresearch/TransCoder',
          revision: 'NeurIPS-2020',
          tokenizer: 'Custom XLM FastBPE',
          license: 'CC-BY-NC-4.0',
          supportedTasks: ['code-to-code'],
          supportedLanguages: ['python', 'java'],
          status: 'INCOMPATIBLE',
          limitations: ['Incompatible with modern Hugging Face Seq2SeqLM pipeline']
        }
      ]);
    }
  });

  return router;
}

