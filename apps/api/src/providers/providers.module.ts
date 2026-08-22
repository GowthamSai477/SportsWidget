import { Global, Module } from "@nestjs/common";
import { JolpicaF1Provider } from "./jolpica/jolpica-f1.provider";
import { MockF1Provider } from "./mock/mock.provider";
import { ProviderHttp } from "./provider.http";
import { ProviderRegistry } from "./provider.registry";

@Global()
@Module({
  providers: [ProviderHttp, JolpicaF1Provider, MockF1Provider, ProviderRegistry],
  exports: [ProviderRegistry],
})
export class ProvidersModule {}
