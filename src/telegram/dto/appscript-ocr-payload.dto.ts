export class AppscriptDepositPayloadDto {
  transactionType: 'deposit';
  transactionDate: string;
  capital: number;
  transactionId: string;
}

export class AppscriptCertificatePayloadDto {
  transactionType: 'certificate';
  transactionDate: string;
  numberOfCertificates: number;
  price: number;
  transactionId: string;
}

export type AppscriptOcrPayloadDto =
  | AppscriptDepositPayloadDto
  | AppscriptCertificatePayloadDto;
