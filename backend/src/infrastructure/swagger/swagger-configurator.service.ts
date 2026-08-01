import * as common from '@nestjs/common';
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AnalysisController } from '@api/controllers/analysis.controller';
import { AuthController } from '@api/controllers/auth.controller';
import { HelloController } from '@api/controllers/hello.controller';
import { ProfileController } from '@api/controllers/profile.controller';
import { ResumeController } from '@api/controllers/resume.controller';
import { UploadController } from '@api/controllers/upload.controller';

interface Resource {
  name: string;
  displayName: string;
  controllers: common.Type<unknown>[];
  description: string;
}

/**
 * Precisa bater com o nome que `@ApiBearerAuth()` usa por padrao nos
 * controllers. Um scheme registrado com outro nome (`JWT`, por exemplo) fica
 * orfao: o Authorize guarda o token nele, a operacao exige `bearer` e o
 * Swagger UI nao envia o header em request nenhuma.
 */
const BEARER_AUTH_NAME = 'bearer';

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
] as const;

@common.Injectable()
export class SwaggerConfiguratorService {
  private readonly systemDescription =
    'API ATS AI Resumer: análise de currículos com IA e controle de versões.\n\n' +
    '**Autenticação:**\n' +
    '- `POST /api/v1/auth/login` retorna o Bearer JWT\n' +
    '- `GET /api/v1/auth/google` inicia o fluxo OAuth com state CSRF em cookie';

  private readonly resources: Resource[] = [
    {
      name: 'Auth',
      displayName: 'Autenticação',
      controllers: [AuthController],
      description:
        'Registro, login, logout, refresh de token, troca de senha e OAuth com Google.',
    },
    {
      name: 'Profile',
      displayName: 'Perfis',
      controllers: [ProfileController],
      description:
        'Consulta e atualização dos perfis de usuário vinculados às contas de autenticação.',
    },
    {
      name: 'Resumes',
      displayName: 'Currículos',
      controllers: [ResumeController],
      description:
        'Criação, listagem, consulta e remoção de currículos, incluindo o histórico de versões.',
    },
    {
      name: 'Analysis',
      displayName: 'Análises',
      controllers: [AnalysisController],
      description:
        'Disparo da análise por IA de um currículo e leitura do resultado por currículo ou por versão.',
    },
    {
      name: 'Upload',
      displayName: 'Upload',
      controllers: [UploadController],
      description:
        'Upload de PDF com validação de tamanho, mime type e magic number, além da extração do texto.',
    },
    {
      name: 'Hello',
      displayName: 'Diagnóstico',
      controllers: [HelloController],
      description: 'Rota de sanidade usada para verificar se a API respondeu.',
    },
  ];

  constructor(
    private readonly app: common.INestApplication,
    private readonly serversUrls: string[],
    private readonly apiBasePath: string,
  ) {}

  public static create(
    app: common.INestApplication<any>,
    serversUrls: string[],
    apiBasePath: string,
  ) {
    return new SwaggerConfiguratorService(app, serversUrls, apiBasePath);
  }

  /** Path absoluto do Swagger UI (ex.: `/api/docs`). Relativo quebra o fetch do swagger.json no browser. */
  private docsPath(): string {
    const base = this.normalizedBasePath();
    return base ? `/${base}/docs` : '/docs';
  }

  private normalizedBasePath(): string {
    return this.apiBasePath.replace(/^\/+|\/+$/g, '');
  }

  public setup(): void {
    const fullDocument = this.createFullDoc();
    for (const resource of this.resources) {
      this.createResourceDoc(resource, fullDocument);
    }
  }

  /**
   * Remove o prefixo global (`/api`) do final da URL do servidor.
   *
   * Os paths do documento carregam o prefixo (`ignoreGlobalPrefix: false`),
   * então um server url já terminado em `/api` viraria `/api/api/...`.
   */
  private normalizeServerUrl(serverUrl: string): string {
    const base = this.normalizedBasePath();
    if (!base) return serverUrl.replace(/\/+$/, '');
    return serverUrl.replace(new RegExp(`/${base}/?$`), '');
  }

  private buildBaseDoc(
    title: string,
    description: string,
  ): Omit<OpenAPIObject, 'paths'> {
    const doc = new DocumentBuilder()
      .setTitle(title)
      .setDescription(description)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT obtido em /api/v1/auth/login',
        },
        BEARER_AUTH_NAME,
      )
      .addSecurityRequirements(BEARER_AUTH_NAME);

    for (const server of this.serversUrls) {
      doc.addServer(this.normalizeServerUrl(server));
    }

    return doc.build();
  }

  private documentOptions(): SwaggerDocumentOptions {
    return {
      deepScanRoutes: true,
      ignoreGlobalPrefix: false,
      operationIdFactory: (controllerKey, methodKey) =>
        `${controllerKey}_${methodKey}`,
    };
  }

  private uiOptions(
    urls: Array<{ url: string; name: string }>,
    siteTitle: string,
  ) {
    return {
      swaggerUiEnabled: true,
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        displayRequestDuration: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        urls,
        explorer: true,
      },
      customSiteTitle: siteTitle,
    };
  }

  private createFullDoc(): OpenAPIObject {
    const docUri = this.docsPath();

    const builder = this.buildBaseDoc(
      'ATS AI Resumer API',
      `Documentação completa da API\n\n${this.systemDescription}`,
    );

    const fullDocument = SwaggerModule.createDocument(
      this.app,
      builder as OpenAPIObject,
      this.documentOptions(),
    );

    SwaggerModule.setup(docUri, this.app, fullDocument, {
      jsonDocumentUrl: `${docUri}/swagger.json`,
      ...this.uiOptions(
        [
          { url: `${docUri}/swagger.json`, name: 'Completo' },
          ...this.resources.map((r) => ({
            url: `${docUri}/${r.name}/swagger.json`,
            name: r.displayName,
          })),
        ],
        'ATS AI Resumer: API Docs',
      ),
    });

    this.app.use(`${docUri}/swagger.json`, (_req: Request, res: Response) => {
      res.json(fullDocument);
    });

    return fullDocument;
  }

  private createResourceDoc(
    resource: Resource,
    fullDocument: OpenAPIObject,
  ): void {
    const { name, displayName, controllers, description } = resource;
    const docUri = this.docsPath();
    const resourceUri = `${docUri}/${name}`;

    const builder = this.buildBaseDoc(
      `${displayName}: ATS AI Resumer API`,
      `${description}\n\n${this.systemDescription}`,
    );

    const moduleDocument: OpenAPIObject = {
      ...builder,
      paths: this.filterPathsByControllers(fullDocument, controllers),
      components: {
        ...fullDocument.components,
        ...builder.components,
        securitySchemes: {
          ...fullDocument.components?.securitySchemes,
          ...builder.components?.securitySchemes,
        },
      },
    };

    SwaggerModule.setup(resourceUri, this.app, moduleDocument, {
      jsonDocumentUrl: `${resourceUri}/swagger.json`,
      ...this.uiOptions(
        [
          { url: `${resourceUri}/swagger.json`, name: displayName },
          { url: `${docUri}/swagger.json`, name: 'API Completa' },
        ],
        `${displayName}: ATS AI Resumer API`,
      ),
    });

    this.app.use(
      `${resourceUri}/swagger.json`,
      (_req: Request, res: Response) => {
        res.json(moduleDocument);
      },
    );
  }

  /**
   * Todos os controllers vivem no `ApiModule`, então `include: [Module]` não
   * separa nada. O recorte é feito pelo `operationId`, que o
   * `operationIdFactory` monta como `NomeDoController_metodo`.
   */
  private filterPathsByControllers(
    document: OpenAPIObject,
    controllers: common.Type<unknown>[],
  ): OpenAPIObject['paths'] {
    const prefixes = controllers.map((controller) => `${controller.name}_`);
    const paths: OpenAPIObject['paths'] = {};

    for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
      const kept: Record<string, unknown> = {};

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!operation) continue;
        const operationId = operation.operationId ?? '';
        if (prefixes.some((prefix) => operationId.startsWith(prefix))) {
          kept[method] = operation;
        }
      }

      if (Object.keys(kept).length > 0) {
        paths[path] = { ...kept } as OpenAPIObject['paths'][string];
      }
    }

    return paths;
  }
}
