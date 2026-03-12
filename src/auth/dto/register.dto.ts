import { IsBoolean, IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

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
