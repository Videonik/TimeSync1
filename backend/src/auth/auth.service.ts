import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async validateOAuthLogin(profile: any): Promise<string> {
    try {
      const conditions: any[] = [
        profile.yandexId ? { yandexId: profile.yandexId } : null,
        profile.vkId ? { vkId: profile.vkId } : null,
        profile.email ? { email: profile.email } : null,
      ].filter(Boolean);

      let user = await this.userRepository.findOne({
        where: conditions,
      });

      if (!user) {
        user = this.userRepository.create({
          yandexId: profile.yandexId,
          vkId: profile.vkId,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          encryptedTokens: profile.accessToken,
        });
      } else {
        // Update info if it changed
        user.yandexId = profile.yandexId || user.yandexId;
        user.vkId = profile.vkId || user.vkId;
        user.name = profile.name || user.name;
        user.avatarUrl = profile.avatarUrl || user.avatarUrl;
        user.encryptedTokens = profile.accessToken || user.encryptedTokens;
      }

      await this.userRepository.save(user);

      const payload = { sub: user.id, email: user.email, name: user.name };
      return this.jwtService.sign(payload);
    } catch (err) {
      throw new Error('OAuth login validation failed: ' + err);
    }
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
    await this.userRepository.update({ id: userId }, data);
    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }
}
