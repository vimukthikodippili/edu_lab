import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportTypeEntity } from '../../../../sports/entities/sport-type.entity';

interface SeedSportType {
  name: string;
  isPersonalBestEligible: boolean;
}

// The 13 original sport types this app launched with, now runtime-editable — this seed only
// gives new deployments the same starting catalog, it no longer fixes what sport types can
// ever exist (an Admin/Principal can add more, e.g. Karate, via SportTypeController).
const SPORT_TYPES: SeedSportType[] = [
  { name: 'Cricket', isPersonalBestEligible: false },
  { name: 'Football (Soccer)', isPersonalBestEligible: false },
  { name: 'Volleyball', isPersonalBestEligible: false },
  { name: 'Basketball', isPersonalBestEligible: false },
  { name: 'Netball', isPersonalBestEligible: false },
  { name: 'Athletics — Track', isPersonalBestEligible: true },
  { name: 'Athletics — Field', isPersonalBestEligible: true },
  { name: 'Badminton', isPersonalBestEligible: false },
  { name: 'Table Tennis', isPersonalBestEligible: false },
  { name: 'Swimming', isPersonalBestEligible: true },
  { name: 'Rugger (Rugby)', isPersonalBestEligible: false },
  { name: 'Chess', isPersonalBestEligible: false },
  { name: 'Carom', isPersonalBestEligible: false },
];

@Injectable()
export class SportTypeSeedService {
  constructor(
    @InjectRepository(SportTypeEntity)
    private readonly sportTypeRepository: Repository<SportTypeEntity>,
  ) {}

  async run(): Promise<void> {
    for (const sportType of SPORT_TYPES) {
      const exists = await this.sportTypeRepository.findOne({
        where: { name: sportType.name },
      });
      if (!exists) {
        await this.sportTypeRepository.save(this.sportTypeRepository.create(sportType));
      }
    }
  }
}
