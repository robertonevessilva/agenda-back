import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateWhatsappSettingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'whatsappPhone deve estar no formato internacional, ex: +5581999999999',
  })
  whatsappPhone?: string;

  @IsOptional()
  @IsBoolean()
  whatsappOptIn?: boolean;
}

